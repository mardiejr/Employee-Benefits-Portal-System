// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from "../../../utils/database";

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
    // Don't throw - we don't want to fail the main operation if logging fails
  }
}

function validatePassword(password: string) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return password.length >= 8 && hasUpperCase && hasNumber;
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, verificationCode, newPassword } = await req.json();

    if (!employeeId || !verificationCode || !newPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    if (!validatePassword(newPassword)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long, include at least one uppercase letter, and one number' },
        { status: 400 }
      );
    }

    // Verify the reset code and get employee data
    const result = await query(
      `SELECT * FROM employees 
       WHERE employee_id = $1 
       AND is_active = true 
       AND reset_code = $2
       AND reset_code_expiry > NOW()`,
      [employeeId, verificationCode]
    );

    if (result.rows.length === 0) {
      await createActivityLog({
        userId: employeeId,
        action: 'PASSWORD_RESET',
        module: 'Authentication',
        details: 'Failed password reset - Invalid or expired verification code',
        status: 'Failed'
      });
      
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    const employee = result.rows[0];
    
    // Update password and clear reset code using transaction
    const queries = [
      {
        text: `UPDATE employees SET 
          password = $1, 
          reset_code = NULL,
          reset_code_expiry = NULL,
          last_password_change = NOW(),
          updated_at = NOW() 
         WHERE employee_id = $2`,
        params: [newPassword, employeeId]
      },
      {
        text: `INSERT INTO activity_logs (
          user_id,
          action,
          module,
          details,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        params: [
          employee.employee_id,
          'PASSWORD_RESET',
          'Authentication',
          'Password reset successful',
          'Success'
        ]
      }
    ];

    await transaction(queries);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}