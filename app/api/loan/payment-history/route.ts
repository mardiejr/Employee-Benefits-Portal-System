// app/api/loan/payment-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

interface PaymentHistory {
  id: number;
  loanId: number;
  loanType: string;
  paymentAmount: number;
  paymentDate: string;
  transactionId: string;
  notes: string;
  paymentMethod: string; // Added field for payment method
  createdAt: string;
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Get loan IDs for this employee
    const loanIdsQuery = `
      -- Get Salary Loan IDs
      SELECT id::integer, 'Salary Loan' as type FROM salary_loan 
      WHERE employee_id = $1
      UNION ALL
      -- Get Car Loan IDs
      SELECT id::integer, 'Car Loan' as type FROM car_loan
      WHERE employee_id = $1
      UNION ALL
      -- Get Housing Loan IDs
      SELECT id::integer, 'Housing Loan' as type FROM housing_loan
      WHERE employee_id = $1
    `;

    console.log('Fetching loan IDs for employee:', employeeId);
    const loanIdsResult = await query(loanIdsQuery, [employeeId]);
    console.log('Loan IDs result:', loanIdsResult.rowCount, 'rows found');
    
    // If no loans found
    if (loanIdsResult.rowCount === 0) {
      return NextResponse.json({
        success: true,
        payments: []
      });
    }

    // Extract loan IDs and types
    const loanIds = loanIdsResult.rows.map(row => parseInt(row.id));
    const loanTypes = loanIdsResult.rows.map(row => row.type);
    
    console.log('Found loans:', { loanIds, loanTypes });

    // Get payment history for these loans, now including payment_method column
    const paymentHistoryQuery = `
      SELECT 
        id,
        loan_id,
        loan_type,
        payment_amount,
        payment_date,
        transaction_id,
        notes,
        payment_method,
        created_at
      FROM loan_payment_history
      WHERE 
        (loan_id = ANY($1::integer[]) AND loan_type = ANY($2::text[]))
      ORDER BY payment_date DESC
    `;

    console.log('Fetching payment history with params:', { loanIds, loanTypes });
    const paymentHistoryResult = await query(paymentHistoryQuery, [loanIds, loanTypes]);
    console.log('Payment history result:', paymentHistoryResult.rowCount, 'payments found');

    const payments = paymentHistoryResult.rows.map(row => ({
      id: row.id,
      loanId: row.loan_id,
      loanType: row.loan_type,
      paymentAmount: parseFloat(row.payment_amount),
      paymentDate: row.payment_date,
      transactionId: row.transaction_id,
      notes: row.notes,
      paymentMethod: row.payment_method || 'Early Payment', // Default to 'Early Payment' if not specified
      createdAt: row.created_at
    }));

    // Now also fetch automatic salary deductions from the deduction tables
    // This allows us to include regular salary deductions alongside early payments
    const deductionsQuery = `
      -- Salary loan deductions
      SELECT 
        id, 
        loan_id as loan_id, 
        'Salary Loan' as loan_type, 
        amount as payment_amount, 
        actual_deduction_date as payment_date,
        'SD-' || id as transaction_id,
        payment_notes,
        CASE WHEN is_early_payment THEN 'Early Payment' ELSE 'Salary Deduction' END as payment_method,
        updated_at as created_at
      FROM salary_loan_deduction
      WHERE 
        loan_id = ANY($1::integer[]) 
        AND status IN ('Deducted', 'Partially Deducted')
        AND actual_deduction_date IS NOT NULL
      UNION ALL
      -- Car loan deductions
      SELECT 
        id, 
        loan_id as loan_id, 
        'Car Loan' as loan_type, 
        amount as payment_amount, 
        actual_deduction_date as payment_date,
        'SD-' || id as transaction_id,
        payment_notes,
        CASE WHEN is_early_payment THEN 'Early Payment' ELSE 'Salary Deduction' END as payment_method,
        updated_at as created_at
      FROM car_loan_deduction
      WHERE 
        loan_id = ANY($1::integer[]) 
        AND status IN ('Deducted', 'Partially Deducted')
        AND actual_deduction_date IS NOT NULL
      UNION ALL
      -- Housing loan deductions
      SELECT 
        id, 
        loan_id as loan_id, 
        'Housing Loan' as loan_type, 
        amount as payment_amount, 
        actual_deduction_date as payment_date,
        'SD-' || id as transaction_id,
        payment_notes,
        CASE WHEN is_early_payment THEN 'Early Payment' ELSE 'Salary Deduction' END as payment_method,
        updated_at as created_at
      FROM housing_loan_deduction
      WHERE 
        loan_id = ANY($1::integer[]) 
        AND status IN ('Deducted', 'Partially Deducted')
        AND actual_deduction_date IS NOT NULL
      ORDER BY payment_date DESC
    `;
    
    // We're not using this result directly as it would duplicate early payments
    // that are already in the payment history table
    // But this query is useful if you want to include salary deductions 
    // that are not recorded in the payment history table

    return NextResponse.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}

// Simple endpoint to test data insertion directly into loan_payment_history
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

    // Check if the employee is an admin for direct inserts
    const isAdminQuery = `
      SELECT a.approval_level, e.position 
      FROM approvers a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.employee_id = $1 AND (
        a.approval_level = 'HR Manager' OR 
        e.position LIKE '%HR%Admin%' OR
        e.position LIKE '%HR%Manager%'
      )
    `;

    const adminResult = await query(isAdminQuery, [employeeId]);
    if (adminResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { loanId, loanType, paymentAmount, notes, paymentMethod } = await req.json();
    
    if (!loanId || !loanType || !paymentAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Direct insertion for testing
    const insertQuery = `
      INSERT INTO loan_payment_history (
        loan_id, 
        loan_type, 
        payment_amount,
        payment_date,
        transaction_id,
        notes,
        payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      loanId,
      loanType,
      paymentAmount,
      new Date().toISOString(),
      `test-${Date.now()}`,
      notes || "Test payment",
      paymentMethod || "Early Payment"
    ]);
    
    return NextResponse.json({
      success: true,
      inserted: result.rows[0]
    });
  } catch (error) {
    console.error("Error testing payment insertion:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Insert test failed" },
      { status: 500 }
    );
  }
}