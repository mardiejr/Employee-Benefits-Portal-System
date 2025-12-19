import { NextRequest, NextResponse } from 'next/server';
import pool, { query, transaction } from "../../../../utils/database";


async function generateDatabaseBackup(type: 'Full Backup' | 'Incremental Backup') {
  try {
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != 'database_backups'
      AND table_name != 'database_backup_schedule'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    let schemaBackup = '';
    for (const table of tables) {
      const schemaResult = await query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM 
          information_schema.columns
        WHERE 
          table_name = $1
        ORDER BY 
          ordinal_position
      `, [table]);
      
      schemaBackup += `-- Table: ${table}\n`;
      schemaBackup += `CREATE TABLE IF NOT EXISTS ${table} (\n`;
      
      const columns = schemaResult.rows.map(col => {
        let colDef = `  "${col.column_name}" ${col.data_type}`;
        if (col.is_nullable === 'NO') colDef += ' NOT NULL';
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`;
        return colDef;
      }).join(',\n');
      
      schemaBackup += columns;
      schemaBackup += '\n);\n\n';
    }
    
    // Generate data for all tables
    let dataBackup = '';
    for (const table of tables) {
      // Skip large tables or history tables for incremental backups
      if (type === 'Incremental Backup' && (
        table.includes('_history') || 
        table.includes('activity_logs')
      )) {
        dataBackup += `-- Skipping large/history table: ${table} for incremental backup\n\n`;
        continue;
      }
      
      const dataResult = await query(`SELECT * FROM ${table}`);
      
      if (dataResult.rows.length > 0) {
        for (const row of dataResult.rows) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          }).join(', ');
          
          dataBackup += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
        }
        dataBackup += '\n';
      }
    }
    
    // Calculate backup size (rough estimate)
    const totalSize = (schemaBackup.length + dataBackup.length) / 1024; // size in KB
    const formattedSize = totalSize > 1024 ? 
      `${(totalSize / 1024).toFixed(2)} MB` : 
      `${Math.ceil(totalSize)} KB`;
    
    // Combine schema and data
    const fullBackup = schemaBackup + dataBackup;
    
    return {
      backupData: fullBackup,
      size: formattedSize
    };
  } catch (error) {
    console.error('Error generating database backup:', error);
    throw error;
  }
}

// Helper function to create activity log entry
async function createActivityLog(params: {
  userId: string;
  action: string;
  module: string;
  details: string;
  status: string;
}) {
  try {
    await query(`
      INSERT INTO activity_logs (
        user_id,
        action,
        module,
        details,
        status,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW()
      )
    `, [
      params.userId,
      params.action,
      params.module,
      params.details,
      params.status
    ]);
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
}

// POST: Process scheduled backups
// This endpoint should be called by a cron job or similar scheduler
export async function POST(request: NextRequest) {
  // This endpoint can be secured with a secret token if needed
  // const authHeader = request.headers.get('Authorization');
  // if (authHeader !== `Bearer ${process.env.BACKUP_SCHEDULER_SECRET}`) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }
  
  try {
    // Check if scheduled backups are enabled
    const scheduleResult = await query(`
      SELECT * FROM database_backup_schedule WHERE enabled = true LIMIT 1
    `);
    
    if (scheduleResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Scheduled backups are not enabled'
      });
    }
    
    const schedule = scheduleResult.rows[0];
    const now = new Date();
    
    // Check if it's time to run a backup
    if (schedule.next_run && new Date(schedule.next_run) > now) {
      return NextResponse.json({
        success: true,
        message: 'No backup scheduled at this time',
        nextRun: schedule.next_run
      });
    }
    
    // Generate filename
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `inlife_backup_${timestamp}.sql`;
    
    // Insert backup record (initially as 'In Progress')
    const insertResult = await query(`
      INSERT INTO database_backups (
        filename,
        type,
        size,
        created_by,
        status,
        note,
        backup_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id
    `, [
      filename,
      'Full Backup',
      '0 KB', // Initial size
      'System Auto',
      'In Progress',
      `Scheduled ${schedule.frequency} backup`,
      '' // Empty backup data initially
    ]);
    
    const backupId = insertResult.rows[0].id;
    
    // Log the activity
    await createActivityLog({
      userId: 'SYSTEM',
      action: 'CREATE',
      module: 'DATABASE_BACKUP',
      details: `Initiated scheduled database backup: ${filename}`,
      status: 'SUCCESS'
    });
    
    // Generate backup
    try {
      const { backupData, size } = await generateDatabaseBackup('Full Backup');
      
      // Update the backup record with the actual data and size
      await query(`
        UPDATE database_backups
        SET 
          backup_data = $1,
          size = $2,
          status = 'Completed'
        WHERE id = $3
      `, [backupData, size, backupId]);
      
      // Calculate next run time based on frequency
      let nextRun: Date;
      
      switch (schedule.frequency) {
        case '8hours':
          nextRun = new Date(now.getTime() + 8 * 60 * 60 * 1000);
          break;
        case 'daily':
          nextRun = new Date(now);
          nextRun.setDate(nextRun.getDate() + 1);
          nextRun.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          nextRun = new Date(now);
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        default:
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Update schedule with last run and next run times
      await query(`
        UPDATE database_backup_schedule
        SET 
          last_run = $1,
          next_run = $2
        WHERE id = $3
      `, [now, nextRun, schedule.id]);
      
      // Log completion
      await createActivityLog({
        userId: 'SYSTEM',
        action: 'UPDATE',
        module: 'DATABASE_BACKUP',
        details: `Completed scheduled database backup: ${filename} (${size})`,
        status: 'SUCCESS'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Scheduled backup completed successfully',
        backupId,
        filename,
        size,
        nextRun
      });
    } catch (error) {
      console.error('Error generating scheduled backup:', error);
      
      // Update status to failed
      await query(`
        UPDATE database_backups
        SET status = 'Failed'
        WHERE id = $1
      `, [backupId]);
      
      // Log failure
      await createActivityLog({
        userId: 'SYSTEM',
        action: 'UPDATE',
        module: 'DATABASE_BACKUP',
        details: `Failed scheduled database backup: ${filename}`,
        status: 'ERROR'
      });
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate scheduled backup' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing scheduled backup:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process scheduled backup' 
    }, { status: 500 });
  }
}