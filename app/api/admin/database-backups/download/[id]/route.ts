import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Readable } from 'stream';
import pool, { query } from "../../../../../utils/database";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  if (!id) {
    return NextResponse.json({ 
      success: false, 
      error: 'Backup ID or filename is required' 
    }, { status: 400 });
  }
  
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get backup metadata first without fetching the full backup data
    const isNumeric = /^\d+$/.test(id);
    
    let sqlQuery, values;
    if (isNumeric) {
      sqlQuery = 'SELECT id, filename, status FROM database_backups WHERE id = $1';
      values = [id];
    } else {
      sqlQuery = 'SELECT id, filename, status FROM database_backups WHERE filename = $1';
      values = [id];
    }
    
    const result = await query(sqlQuery, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Backup not found' 
      }, { status: 404 });
    }
    
    const backup = result.rows[0];
    
    // Check if backup is completed
    if (backup.status !== 'Completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Backup is not ready for download' 
      }, { status: 400 });
    }
    
    // Log the activity before fetching the backup data
    await createActivityLog({
      userId: employeeId,
      action: 'DOWNLOAD',
      module: 'DATABASE_BACKUP',
      details: `Downloaded database backup: ${backup.filename}`,
      status: 'SUCCESS'
    });
    
    // Get the actual backup data in a single query
    const dataQuery = 'SELECT backup_data FROM database_backups WHERE id = $1';
    const dataResult = await query(dataQuery, [backup.id]);
    
    if (dataResult.rows.length === 0 || !dataResult.rows[0].backup_data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Backup data not found' 
      }, { status: 404 });
    }
    
    // Create a response with the backup data
    const response = new NextResponse(dataResult.rows[0].backup_data);
    response.headers.set('Content-Type', 'application/sql');
    response.headers.set('Content-Disposition', `attachment; filename=${backup.filename}`);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error) {
    console.error('Error downloading backup:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to download backup' 
    }, { status: 500 });
  }
}