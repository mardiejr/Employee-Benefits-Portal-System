// app/api/admin/record-payment/route.ts
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

    // Check if the employee is an admin
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

    const { loanId, loanType, paymentAmount, notes, skipDeductionProcessing } = await req.json();
    
    if (!loanId || !loanType || !paymentAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const exactPaymentAmount = parseFloat(paymentAmount.toString());
    const formattedAmount = exactPaymentAmount.toLocaleString();
    const paymentDate = new Date().toISOString();
    const txId = `EP-${Date.now()}`; // EP prefix for Early Payment
    const paymentNotes = notes || `Early payment of ₱${formattedAmount}`;

    console.log("⭐️ RECORDING DIRECT PAYMENT:", {
      loanId,
      loanType, 
      exactPaymentAmount,
      txId,
      skipDeductionProcessing
    });

    // Begin transaction
    await query('BEGIN');

    try {
      // 1. Insert directly into payment history table - full amount
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
        exactPaymentAmount,
        paymentDate,
        txId,
        paymentNotes,
        'Early Payment' // Explicitly set payment method
      ]);

      const updatedDeductions = [];
      
      // 2. Skip deduction processing if skipDeductionProcessing is true
      if (!skipDeductionProcessing) {
        // Determine table name based on loan type
        let deductionTable;
        if (loanType === 'Salary Loan') {
          deductionTable = 'salary_loan_deduction';
        } else if (loanType === 'Car Loan') {
          deductionTable = 'car_loan_deduction';
        } else if (loanType === 'Housing Loan') {
          deductionTable = 'housing_loan_deduction';
        } else {
          throw new Error("Invalid loan type");
        }

        // Find upcoming deductions and mark the necessary ones as paid early
        // Starting with the closest due date
        let remainingPayment = exactPaymentAmount;
        
        const upcomingDeductionsQuery = `
          SELECT id, deduction_date, amount, status
          FROM ${deductionTable}
          WHERE loan_id = $1 
          AND status IN ('Upcoming', 'Pending')
          ORDER BY deduction_date ASC
        `;
        
        const upcomingDeductions = await query(upcomingDeductionsQuery, [loanId]);
        
        // Apply payment to upcoming deductions
        for (const deduction of upcomingDeductions.rows) {
          const deductionAmount = parseFloat(deduction.amount);
          
          if (remainingPayment <= 0) break;
          
          if (remainingPayment >= deductionAmount) {
            // Full payment for this deduction
            const updateQuery = `
              UPDATE ${deductionTable}
              SET 
                status = 'Deducted',
                actual_deduction_date = $1,
                is_early_payment = TRUE,
                payment_notes = $2,
                payment_amount = $3,
                payment_status = 'Fully Paid'
              WHERE id = $4
              RETURNING *
            `;
            
            const updateResult = await query(updateQuery, [
              paymentDate,
              paymentNotes,
              deductionAmount,
              deduction.id
            ]);
            
            updatedDeductions.push(updateResult.rows[0]);
            remainingPayment -= deductionAmount;
          } else {
            // Partial payment for this deduction
            const updateQuery = `
              UPDATE ${deductionTable}
              SET 
                status = 'Partially Deducted',
                actual_deduction_date = $1,
                is_early_payment = TRUE,
                payment_notes = $2,
                payment_amount = $3,
                payment_status = 'Partially Paid'
              WHERE id = $4
              RETURNING *
            `;
            
            const updateResult = await query(updateQuery, [
              paymentDate,
              paymentNotes,
              remainingPayment,
              deduction.id
            ]);
            
            updatedDeductions.push(updateResult.rows[0]);
            remainingPayment = 0;
          }
        }

        // 3. Check if loan is fully paid and update loan status if needed
        let loanAmountColumn;
        let loanTable;
        
        if (loanType === 'Salary Loan') {
          loanTable = 'salary_loan';
          loanAmountColumn = 'loan_amount';
        } else if (loanType === 'Car Loan') {
          loanTable = 'car_loan';
          loanAmountColumn = 'loan_amount_requested';
        } else if (loanType === 'Housing Loan') {
          loanTable = 'housing_loan';
          loanAmountColumn = 'loan_amount_requested';
        }
        
        // Get total loan amount
        const loanQuery = `
          SELECT ${loanAmountColumn} as total_amount
          FROM ${loanTable}
          WHERE id = $1
        `;
        
        const loanResult = await query(loanQuery, [loanId]);
        const totalLoanAmount = parseFloat(loanResult.rows[0].total_amount);
        
        // Calculate total paid amount
        const paidAmountQuery = `
          SELECT SUM(payment_amount) as total_paid
          FROM loan_payment_history
          WHERE loan_id = $1 AND loan_type = $2
        `;
        
        const paidAmountResult = await query(paidAmountQuery, [loanId, loanType]);
        const totalPaid = parseFloat(paidAmountResult.rows[0].total_paid || '0');
        
        // If fully paid, mark loan as completed
        if (totalPaid >= totalLoanAmount - 0.01) { // Allow for tiny rounding differences
          const completeLoanQuery = `
            UPDATE ${loanTable}
            SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `;
          
          await query(completeLoanQuery, [loanId]);
          
          // Cancel any remaining deductions
          const cancelRemainingQuery = `
            UPDATE ${deductionTable}
            SET 
              status = 'Cancelled',
              payment_notes = 'Cancelled due to early loan completion'
            WHERE loan_id = $1 AND status IN ('Upcoming', 'Pending')
          `;
          
          await query(cancelRemainingQuery, [loanId]);
        }
      }
      
      await query('COMMIT');

      console.log("⭐️ PAYMENT RECORDED SUCCESSFULLY:", result.rows[0]);

      return NextResponse.json({
        success: true,
        message: `Payment of ₱${formattedAmount} recorded successfully`,
        payment: result.rows[0],
        updatedDeductions: updatedDeductions,
        loanCompleted: skipDeductionProcessing ? false : (updatedDeductions.length > 0)
      });
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}