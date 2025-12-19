// app/api/test/loan-deductions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

export async function POST(req: NextRequest) {
  try {
    // Get the logged-in user's employee_id from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Check if the employee is an admin or HR
    const isAdminQuery = `
      SELECT a.approval_level, e.position 
      FROM approvers a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.employee_id = $1 AND (
        a.approval_level = 'HR Manager' OR 
        e.position LIKE '%HR%Admin%' OR
        e.position LIKE '%HR%Manager%' OR
        e.position LIKE '%Admin%'
      )
    `;

    const adminResult = await query(isAdminQuery, [employeeId]);

    if (adminResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Parse the test date from the request body
    const { testDate } = await req.json();
    
    if (!testDate || !isValidDate(testDate)) {
      return NextResponse.json(
        { error: "Invalid test date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Execute each update query separately with payment_status updates
    
    // Update salary loan deductions
    const updateSalaryLoanQuery = `
      UPDATE salary_loan_deduction
      SET 
        status = CASE 
          WHEN deduction_date <= $1::date THEN 'Deducted'
          WHEN date_trunc('month', deduction_date) = date_trunc('month', $1::date) THEN 'Pending'
          ELSE 'Upcoming'
        END,
        actual_deduction_date = CASE 
          WHEN deduction_date <= $1::date AND actual_deduction_date IS NULL THEN deduction_date
          ELSE actual_deduction_date
        END,
        payment_status = CASE
          WHEN deduction_date <= $1::date THEN 'Fully Paid'
          ELSE payment_status
        END,
        payment_amount = CASE
          WHEN deduction_date <= $1::date THEN amount
          ELSE payment_amount
        END
      WHERE status NOT IN ('Cancelled') 
        AND is_early_payment IS NOT TRUE
    `;

    // Update car loan deductions
    const updateCarLoanQuery = `
      UPDATE car_loan_deduction
      SET 
        status = CASE 
          WHEN deduction_date <= $1::date THEN 'Deducted'
          WHEN date_trunc('month', deduction_date) = date_trunc('month', $1::date) THEN 'Pending'
          ELSE 'Upcoming'
        END,
        actual_deduction_date = CASE 
          WHEN deduction_date <= $1::date AND actual_deduction_date IS NULL THEN deduction_date
          ELSE actual_deduction_date
        END,
        payment_status = CASE
          WHEN deduction_date <= $1::date THEN 'Fully Paid'
          ELSE payment_status
        END,
        payment_amount = CASE
          WHEN deduction_date <= $1::date THEN amount
          ELSE payment_amount
        END
      WHERE status NOT IN ('Cancelled')
    `;
    
    // Update housing loan deductions
    const updateHousingLoanQuery = `
      UPDATE housing_loan_deduction
      SET 
        status = CASE 
          WHEN deduction_date <= $1::date THEN 'Deducted'
          WHEN date_trunc('month', deduction_date) = date_trunc('month', $1::date) THEN 'Pending'
          ELSE 'Upcoming'
        END,
        actual_deduction_date = CASE 
          WHEN deduction_date <= $1::date AND actual_deduction_date IS NULL THEN deduction_date
          ELSE actual_deduction_date
        END,
        payment_status = CASE
          WHEN deduction_date <= $1::date THEN 'Fully Paid'
          ELSE payment_status
        END,
        payment_amount = CASE
          WHEN deduction_date <= $1::date THEN amount
          ELSE payment_amount
        END
      WHERE status NOT IN ('Cancelled')
    `;

    // Execute each query separately
    await query(updateSalaryLoanQuery, [testDate]);
    await query(updateCarLoanQuery, [testDate]);
    await query(updateHousingLoanQuery, [testDate]);

    // Create activity log entry
    const activityLogQuery = `
      INSERT INTO activity_logs (
        user_id, 
        action, 
        module, 
        details, 
        status
      ) VALUES (
        $1, 
        'TEST', 
        'Loan Deductions', 
        $2, 
        'Success'
      )
    `;

    await query(activityLogQuery, [
      employeeId, 
      `Updated deduction statuses using test date: ${testDate}`
    ]);

    return NextResponse.json({
      success: true,
      message: `Updated deduction statuses using test date: ${testDate}`
    });
  } catch (error) {
    console.error("Error updating deduction statuses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update deduction statuses" },
      { status: 500 }
    );
  }
}

// Helper function to validate date format
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}