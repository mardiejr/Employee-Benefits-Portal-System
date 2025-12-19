import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    const { currentPassword, newPassword } = data;
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }
    
    const checkPasswordQuery = `
      SELECT password FROM employees 
      WHERE employee_id = $1 AND is_active = true
    `;
    
    const checkResult = await query(checkPasswordQuery, [employeeId]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    
    const storedPassword = checkResult.rows[0].password;
    
    // In a real application, you would use bcrypt.compare()
    // const passwordMatch = await bcrypt.compare(currentPassword, storedPassword);
    // For this demo, we'll do a simple comparison
    const passwordMatch = currentPassword === storedPassword;
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }
    
    // In a real application, you would hash the new password
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    // For this demo, we'll store it plaintext
    const newPasswordValue = newPassword;
    
    const updateQuery = `
      UPDATE employees
      SET 
        password = $1,
        last_password_change = NOW(),
        updated_at = NOW()
      WHERE employee_id = $2 AND is_active = true
      RETURNING last_password_change
    `;
    
    const result = await query(updateQuery, [newPasswordValue, employeeId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
      last_password_change: result.rows[0].last_password_change
    });
    
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}