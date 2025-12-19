import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool, { query, transaction } from "../../../utils/database";

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
    console.error('Error generating backup:', error);
    throw error;
  }
}

// GET: Fetch all backups
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get backup schedule
    const scheduleResult = await query(`
      SELECT * FROM database_backup_schedule LIMIT 1
    `);
    
    const schedule = scheduleResult.rows[0] || {
      frequency: 'daily',
      enabled: false,
      last_run: null,
      next_run: null
    };
    
    // Get all backups
    const backupsResult = await query(`
      SELECT 
        id, 
        filename, 
        type, 
        size, 
        created_by, 
        created_at, 
        status, 
        note 
      FROM 
        database_backups 
      ORDER BY 
        created_at DESC
    `);
    
    return NextResponse.json({
      success: true,
      backups: backupsResult.rows,
      schedule
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch backups' 
    }, { status: 500 });
  }
}

// POST: Create a new backup
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get admin name from session or database
    let adminName = "";
    
    try {
      // First check if we have the employee data in cookies
      const firstName = cookieStore.get('first_name')?.value;
      const lastName = cookieStore.get('last_name')?.value;
      
      if (firstName && lastName) {
        adminName = `${firstName} ${lastName}`;
      } else {
        // If not in cookies, fetch from database
        const employeeResult = await query(`
          SELECT first_name, last_name 
          FROM employees 
          WHERE employee_id = $1
        `, [employeeId]);
        
        if (employeeResult.rows.length > 0) {
          const { first_name, last_name } = employeeResult.rows[0];
          adminName = `${first_name} ${last_name}`;
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
    
    // If we still don't have a name, use a fallback
    if (!adminName) {
      adminName = "Admin User";
    }
    
    // Parse request body
    const { type, note } = await request.json();
    
    // Validate backup type
    if (type !== 'full' && type !== 'incremental') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid backup type' 
      }, { status: 400 });
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const backupType = type === 'full' ? 'backup' : 'incremental';
    const filename = `inlife_${backupType}_${timestamp}.sql`;
    
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
      type === 'full' ? 'Full Backup' : 'Incremental Backup',
      '0 KB', // Initial size
      adminName, // Use the admin's full name
      'In Progress',
      note || (type === 'full' ? 'Manual full backup' : 'Manual incremental backup'),
      '' // Empty backup data initially
    ]);
    
    const backupId = insertResult.rows[0].id;
    
    // Log the activity
    await createActivityLog({
      userId: employeeId,
      action: 'CREATE',
      module: 'DATABASE_BACKUP',
      details: `Initiated ${type} database backup: ${filename}`,
      status: 'SUCCESS'
    });
    
    // Generate backup asynchronously
    // In a real production system, this would be a background job
    // For a capstone project, we'll do it here but not wait for it to complete
    generateDatabaseBackup(type === 'full' ? 'Full Backup' : 'Incremental Backup')
      .then(async ({ backupData, size }) => {
        try {
          // Update the backup record with the actual data and size
          await query(`
            UPDATE database_backups
            SET 
              backup_data = $1,
              size = $2,
              status = 'Completed'
            WHERE id = $3
          `, [backupData, size, backupId]);
          
          // Log completion
          await createActivityLog({
            userId: employeeId,
            action: 'UPDATE',
            module: 'DATABASE_BACKUP',
            details: `Completed ${type} database backup: ${filename} (${size})`,
            status: 'SUCCESS'
          });
        } catch (error) {
          console.error('Error finalizing backup:', error);
          // Update status to failed
          await query(`
            UPDATE database_backups
            SET status = 'Failed'
            WHERE id = $1
          `, [backupId]);
          
          // Log failure
          await createActivityLog({
            userId: employeeId,
            action: 'UPDATE',
            module: 'DATABASE_BACKUP',
            details: `Failed ${type} database backup: ${filename}`,
            status: 'ERROR'
          });
        }
      })
      .catch(async (error) => {
        console.error('Error generating backup:', error);
        try {
          // Update status to failed
          await query(`
            UPDATE database_backups
            SET status = 'Failed'
            WHERE id = $1
          `, [backupId]);
          
          // Log failure
          await createActivityLog({
            userId: employeeId,
            action: 'UPDATE',
            module: 'DATABASE_BACKUP',
            details: `Failed to generate ${type} database backup: ${filename}`,
            status: 'ERROR'
          });
        } catch (innerError) {
          console.error('Error updating failed backup:', innerError);
        }
      });
    
    // Return immediately with the backup ID
    return NextResponse.json({
      success: true,
      message: 'Backup initiated successfully',
      backupId,
      filename,
      createdBy: adminName // Include creator name in response
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create backup' 
    }, { status: 500 });
  }
}

// PUT: Update backup schedule
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Parse request body
    const { frequency, enabled } = await request.json();
    
    // Validate frequency
    if (!['8hours', 'daily', 'weekly'].includes(frequency)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid frequency' 
      }, { status: 400 });
    }
    
    // Calculate next run time based on frequency
    const now = new Date();
    let nextRun: Date;
    
    switch (frequency) {
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
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
        nextRun.setHours(0, 0, 0, 0);
        break;
      default:
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // Update schedule
    await query(`
      UPDATE database_backup_schedule
      SET 
        frequency = $1,
        enabled = $2,
        next_run = $3
      WHERE id = (SELECT id FROM database_backup_schedule LIMIT 1)
    `, [frequency, enabled, nextRun]);
    
    // If no rows were updated, insert a new record
    const result = await query('SELECT COUNT(*) FROM database_backup_schedule');
    if (parseInt(result.rows[0].count) === 0) {
      await query(`
        INSERT INTO database_backup_schedule (
          frequency, 
          enabled, 
          next_run, 
          created_at, 
          updated_at
        ) VALUES (
          $1, $2, $3, NOW(), NOW()
        )
      `, [frequency, enabled, nextRun]);
    }
    
    // Log the activity
    await createActivityLog({
      userId: employeeId,
      action: 'UPDATE',
      module: 'DATABASE_BACKUP_SCHEDULE',
      details: `Updated backup schedule: ${frequency}, ${enabled ? 'enabled' : 'disabled'}`,
      status: 'SUCCESS'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Backup schedule updated successfully',
      schedule: {
        frequency,
        enabled,
        next_run: nextRun
      }
    });
  } catch (error) {
    console.error('Error updating backup schedule:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update backup schedule' 
    }, { status: 500 });
  }
}

// DELETE: Delete a backup
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ 
      success: false, 
      error: 'Backup ID is required' 
    }, { status: 400 });
  }
  
  try {
    // Check authorization
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get backup details for logging
    const backupResult = await query(`
      SELECT filename FROM database_backups WHERE id = $1
    `, [id]);
    
    if (backupResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Backup not found' 
      }, { status: 404 });
    }
    
    const filename = backupResult.rows[0].filename;
    
    // Delete the backup
    await query(`
      DELETE FROM database_backups WHERE id = $1
    `, [id]);
    
    // Log the activity
    await createActivityLog({
      userId: employeeId,
      action: 'DELETE',
      module: 'DATABASE_BACKUP',
      details: `Deleted database backup: ${filename}`,
      status: 'SUCCESS'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete backup' 
    }, { status: 500 });
  }
}