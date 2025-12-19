// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool, { query, transaction } from "../../../utils/database";
import nodemailer from 'nodemailer';

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

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-company-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
  secure: true,
  tls: {
    rejectUnauthorized: false
  }
});

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    if (!employeeId || employeeId.trim() === '') {
      return NextResponse.json(
        { error: 'Please enter a valid Employee ID' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT * FROM employees WHERE employee_id = $1 AND is_active = true',
      [employeeId]
    );

    if (result.rows.length === 0) {
      await createActivityLog({
        userId: employeeId,
        action: 'PASSWORD_RESET_REQUEST',
        module: 'Authentication',
        details: 'Failed password reset request - Invalid employee ID',
        status: 'Failed'
      });
      
      return NextResponse.json(
        { error: 'Invalid Employee ID. Please check and try again.' },
        { status: 400 }
      );
    }

    const employee = result.rows[0];
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 15); // Code expires in 15 minutes
    
    // Store the verification code in the database
    await query(
      `UPDATE employees SET 
        reset_code = $1, 
        reset_code_expiry = $2,
        updated_at = NOW() 
      WHERE employee_id = $3`,
      [verificationCode, expiryTime, employeeId]
    );
    
    // Send verification code via email using Nodemailer
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-company-email@gmail.com',
        to: employee.email,
        subject: 'Password Reset Verification Code - Insular Life Employee Portal',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Password Reset Verification</h2>
            <p>Hello ${employee.first_name},</p>
            <p>You requested a password reset for your Insular Life Employee Portal account (${employee.employee_id}).</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
              ${verificationCode}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email or contact our support team.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
              This is an automated message, please do not reply.
              <br/>
              © ${new Date().getFullYear()} Insular Life. All rights reserved.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${employee.email}`);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still proceed with the API response even if email fails
      // In production, you might want to handle this differently
    }
    
    // Log the successful request
    await createActivityLog({
      userId: employee.employee_id,
      action: 'PASSWORD_RESET_REQUEST',
      module: 'Authentication',
      details: 'Password reset verification code sent',
      status: 'Success'
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}