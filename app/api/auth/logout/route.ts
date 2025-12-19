// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from "../../../utils/database";

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
    // Don't throw - we don't want to fail logout if logging fails
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get the employee ID from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

    // Clear the cookie
    response.cookies.set('employee_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, 
      path: '/',
    });

    // Only log the activity if we have an employee ID
    if (employeeId) {
      await createActivityLog({
        userId: employeeId,
        action: 'LOGOUT',
        module: 'Authentication',
        details: 'User logged out successfully',
        status: 'Success'
      });
    }

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}