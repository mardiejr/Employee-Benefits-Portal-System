// app/api/loan/check-eligibility/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

export async function GET(req: NextRequest) {
  try {
    // Get employee_id from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const loanType = searchParams.get('type');
    
    if (!loanType || !['salary', 'housing', 'car'].includes(loanType)) {
      return NextResponse.json(
        { error: "Invalid loan type specified" },
        { status: 400 }
      );
    }
    
    const employeeQuery = `
      SELECT role_class
      FROM employees
      WHERE employee_id = $1
    `;
    
    const employeeResult = await query(employeeQuery, [employeeId]);
    
    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    
    const roleClass = employeeResult.rows[0].role_class;
    
    // Check for class restrictions
    if (roleClass === 'Class C' && loanType !== 'salary') {
      return NextResponse.json({
        eligible: false,
        reason: `Class C employees can only apply for Salary Loans.`,
        roleClass
      });
    }
    
    // Check for existing loans of each type
    const existingHousingLoans = await checkExistingLoans(employeeId, 'housing');
    const existingCarLoans = await checkExistingLoans(employeeId, 'car');
    const existingSalaryLoans = await checkExistingLoans(employeeId, 'salary');
    
    // If requesting housing loan
    if (loanType === 'housing') {
      // Cannot have car or salary loan
      if (existingCarLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You have an active or pending Car Loan. Housing Loan cannot be combined with Car Loan.`,
          roleClass
        });
      }
      
      if (existingSalaryLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You have an active or pending Salary Loan. Housing Loan cannot be combined with Salary Loan.`,
          roleClass
        });
      }
      
      // Cannot have another housing loan
      if (existingHousingLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You already have an active or pending Housing Loan.`,
          roleClass
        });
      }
    }
    
    // If requesting car loan
    if (loanType === 'car') {
      // Cannot have housing loan
      if (existingHousingLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You have an active or pending Housing Loan. Car Loan cannot be combined with Housing Loan.`,
          roleClass
        });
      }
      
      // Cannot have another car loan
      if (existingCarLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You already have an active or pending Car Loan.`,
          roleClass
        });
      }
    }
    
    // If requesting salary loan
    if (loanType === 'salary') {
      // Cannot have housing loan
      if (existingHousingLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You have an active or pending Housing Loan. Salary Loan cannot be combined with Housing Loan.`,
          roleClass
        });
      }
      
      // Cannot have another salary loan
      if (existingSalaryLoans) {
        return NextResponse.json({
          eligible: false,
          reason: `You already have an active or pending Salary Loan.`,
          roleClass
        });
      }
    }
    
    // If all checks pass, the employee is eligible
    return NextResponse.json({
      eligible: true,
      roleClass
    });
    
  } catch (error) {
    console.error("Error checking loan eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check loan eligibility" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if employee has an existing loan of a specific type
 * @param employeeId - The employee ID
 * @param loanType - The loan type (salary, car, or housing)
 * @returns boolean - True if employee has an active or pending loan of this type
 */
async function checkExistingLoans(employeeId: string, loanType: string): Promise<boolean> {
  let queryText = '';
  
  if (loanType === 'salary') {
    queryText = `
      SELECT COUNT(*) as count
      FROM salary_loan
      WHERE employee_id = $1 AND status IN ('Pending', 'Approved')
    `;
  } else if (loanType === 'car') {
    queryText = `
      SELECT COUNT(*) as count
      FROM car_loan
      WHERE employee_id = $1 AND status IN ('Pending', 'Approved')
    `;
  } else if (loanType === 'housing') {
    queryText = `
      SELECT COUNT(*) as count
      FROM housing_loan
      WHERE employee_id = $1 AND status IN ('Pending', 'Approved')
    `;
  }
  
  const result = await query(queryText, [employeeId]);
  return parseInt(result.rows[0].count) > 0;
}