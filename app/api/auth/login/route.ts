// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pool, { query, transaction } from "../../../utils/database";

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

export async function POST(req: NextRequest) {
  try {
    const { employeeId, password } = await req.json()

    if (!employeeId || !password) {
      return NextResponse.json(
        { error: 'Employee ID and password are required' },
        { status: 400 }
      )
    }

    const result = await query(
      'SELECT * FROM employees WHERE employee_id = $1 AND is_active = true',
      [employeeId]
    )

    // Log failed login attempt if user doesn't exist
    if (result.rows.length === 0) {
      // Log the failed attempt with the provided employeeId
      await createActivityLog({
        userId: employeeId, // Using the attempted ID even though it may not exist
        action: 'LOGIN',
        module: 'Authentication',
        details: 'Failed login attempt - Invalid employee ID',
        status: 'Failed'
      });
      
      return NextResponse.json(
        { error: 'Invalid employee ID or password' },
        { status: 401 }
      )
    }

    const employee = result.rows[0]

    // Log failed login attempt if password is incorrect
    if (password !== employee.password) {
      await createActivityLog({
        userId: employeeId,
        action: 'LOGIN',
        module: 'Authentication',
        details: 'Failed login attempt - Invalid password',
        status: 'Failed'
      });
      
      return NextResponse.json(
        { error: 'Invalid employee ID or password' },
        { status: 401 }
      )
    }

    // Update employee's last activity timestamp
    await query(
      'UPDATE employees SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [employee.id]
    )

    // Log successful login
    await createActivityLog({
      userId: employee.employee_id,
      action: 'LOGIN',
      module: 'Authentication',
      details: 'User logged in successfully',
      status: 'Success'
    });

    const { password: _, ...employeeData } = employee
    
    // Create response with employee data
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      employee: {
        id: employeeData.id,
        employeeId: employeeData.employee_id,
        firstName: employeeData.first_name,
        lastName: employeeData.last_name,
        email: employeeData.email,
        department: employeeData.department,
        position: employeeData.position,
        fullName: `${employeeData.first_name} ${employeeData.last_name}`,
      }
    })

    // Set cookie with employee_id for session management
    response.cookies.set('employee_id', employeeData.employee_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}