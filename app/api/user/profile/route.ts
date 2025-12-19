import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

export async function GET() {
  try {
    // Get the logged-in user's employee_id from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    // If no employee_id in cookies, return unauthorized
    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }
    
    const sqlQuery = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.gender,
        e.nationality,
        e.address,
        e.phone_number,
        e.email,
        e.department,
        e.position,
        e.salary,
        e.hire_date,
        e.role_class,
        e.profile_picture,
        e.benefits_package,
        e.benefits_amount_remaining,
        a.approval_level
      FROM employees e
      LEFT JOIN approvers a ON e.employee_id = a.employee_id
      WHERE e.employee_id = $1 AND e.is_active = true
    `;
    
    const result = await query(sqlQuery, [employeeId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}