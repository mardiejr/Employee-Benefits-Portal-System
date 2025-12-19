// app/api/loan/deductions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

interface DeductionData {
  id: number;
  deductionDate: string;
  amount: number;
  status: string;
  paymentStatus?: string;
  actualDeductionDate: string | null;
  isEarlyPayment?: boolean;
  paymentNotes?: string;
  paymentAmount?: number;
}

interface PaymentTransaction {
  date: string;
  amount: number;
  appliedTo: string;
  paymentType: string;
  notes?: string;
}

interface PaymentHistory {
  id: number;
  loanId: number;
  loanType: string;
  paymentAmount: number;
  paymentDate: string;
  transactionId: string;
  notes: string;
}

interface LoanData {
  id: number;
  type: string;
  amount: number;
  repaymentTerm: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  propertyType?: string;
  propertyAddress?: string;
  deductions: DeductionData[];
  payments: PaymentTransaction[];
  // Payment history stats
  paidAmount?: number;
  remainingAmount?: number;
  paidMonths?: number;
  remainingMonths?: number;
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

    // Modified query to exclude deductions that have been paid early
    // This prevents deductions from being automatically marked as "Deducted" if they were already paid early
    const updateStatusesQuery = `
      -- Update salary loan deductions
      UPDATE salary_loan_deduction
      SET 
        status = CASE 
          WHEN deduction_date <= CURRENT_DATE THEN 'Deducted'
          WHEN date_trunc('month', deduction_date) = date_trunc('month', CURRENT_DATE) THEN 'Pending'
          ELSE 'Upcoming'
        END,
        actual_deduction_date = CASE 
          WHEN deduction_date <= CURRENT_DATE AND actual_deduction_date IS NULL THEN deduction_date
          ELSE actual_deduction_date
        END
      WHERE status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled') 
        AND deduction_date <= CURRENT_DATE
        AND is_early_payment IS NOT TRUE;  -- Skip updating deductions that were already paid early
      
      -- Update car loan deductions
      UPDATE car_loan_deduction
      SET 
        status = CASE 
          WHEN deduction_date <= CURRENT_DATE THEN 'Deducted'
          WHEN date_trunc('month', deduction_date) = date_trunc('month', CURRENT_DATE) THEN 'Pending'
          ELSE 'Upcoming'
        END,
        actual_deduction_date = CASE 
          WHEN deduction_date <= CURRENT_DATE AND actual_deduction_date IS NULL THEN deduction_date
          ELSE actual_deduction_date
        END
      WHERE status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled') 
        AND deduction_date <= CURRENT_DATE
        AND is_early_payment IS NOT TRUE;  -- Skip updating deductions that were already paid early
      
      -- Update housing loan deductions
      UPDATE housing_loan_deduction
      SET 
        status = CASE 
          WHEN deduction_date <= CURRENT_DATE THEN 'Deducted'
          WHEN date_trunc('month', deduction_date) = date_trunc('month', CURRENT_DATE) THEN 'Pending'
          ELSE 'Upcoming'
        END,
        actual_deduction_date = CASE 
          WHEN deduction_date <= CURRENT_DATE AND actual_deduction_date IS NULL THEN deduction_date
          ELSE actual_deduction_date
        END
      WHERE status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled') 
        AND deduction_date <= CURRENT_DATE
        AND is_early_payment IS NOT TRUE;  -- Skip updating deductions that were already paid early
    `;

    // Run the updates before fetching loans
    await query(updateStatusesQuery);

    const completionCheckQuery = `
  -- Check and complete salary loans
  UPDATE salary_loan sl
  SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
  WHERE status = 'Approved'
  AND id IN (
    SELECT loan_id 
    FROM salary_loan_deduction 
    WHERE loan_id = sl.id
    GROUP BY loan_id
    HAVING SUM(CASE WHEN status = 'Deducted' THEN amount ELSE 0 END) >= sl.loan_amount - 0.01
  );

  -- Check and complete car loans
  UPDATE car_loan cl
  SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
  WHERE status = 'Approved'
  AND id IN (
    SELECT loan_id 
    FROM car_loan_deduction 
    WHERE loan_id = cl.id
    GROUP BY loan_id
    HAVING SUM(CASE WHEN status = 'Deducted' THEN amount ELSE 0 END) >= cl.loan_amount_requested - 0.01
  );

  -- Check and complete housing loans
  UPDATE housing_loan hl
  SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
  WHERE status = 'Approved'
  AND id IN (
    SELECT loan_id 
    FROM housing_loan_deduction 
    WHERE loan_id = hl.id
    GROUP BY loan_id
    HAVING SUM(CASE WHEN status = 'Deducted' THEN amount ELSE 0 END) >= hl.loan_amount_requested - 0.01
  );
`;

    await query(completionCheckQuery);
    // Fetch all salary loans with their deduction schedules - including early payment flag
    const salaryLoanQuery = `
      SELECT 
        sl.id,
        'Salary Loan' as type,
        sl.loan_amount as amount,
        sl.repayment_term,
        sl.status,
        sl.submitted_at,
        sl.updated_at,
        sld.id as deduction_id,
        sld.deduction_date,
        sld.amount as deduction_amount,
        sld.status as deduction_status,
        sld.actual_deduction_date,
        sld.is_early_payment,
        sld.payment_notes,
        sld.payment_amount,
        sld.payment_status
      FROM salary_loan sl
      LEFT JOIN salary_loan_deduction sld ON sl.id = sld.loan_id
      WHERE sl.employee_id = $1 AND sl.status IN ('Approved', 'Completed')
      ORDER BY sl.id, sld.deduction_date
    `;

    // Fetch all car loans with their deduction schedules - including early payment flag
    const carLoanQuery = `
      SELECT 
        cl.id,
        'Car Loan' as type,
        cl.loan_amount_requested as amount,
        cl.repayment_term,
        cl.status,
        cl.submitted_at,
        cl.updated_at,
        cl.car_make,
        cl.car_model,
        cl.car_year,
        cld.id as deduction_id,
        cld.deduction_date,
        cld.amount as deduction_amount,
        cld.status as deduction_status,
        cld.actual_deduction_date,
        cld.is_early_payment,
        cld.payment_notes,
        cld.payment_amount,
        cld.payment_status
      FROM car_loan cl
      LEFT JOIN car_loan_deduction cld ON cl.id = cld.loan_id
      WHERE cl.employee_id = $1 AND cl.status IN ('Approved', 'Completed')
      ORDER BY cl.id, cld.deduction_date
    `;

    // Fetch all housing loans with their deduction schedules - including early payment flag
    const housingLoanQuery = `
      SELECT 
        hl.id,
        'Housing Loan' as type,
        hl.loan_amount_requested as amount,
        hl.repayment_term,
        hl.status,
        hl.submitted_at,
        hl.updated_at,
        hl.property_type,
        hl.property_address,
        hld.id as deduction_id,
        hld.deduction_date,
        hld.amount as deduction_amount,
        hld.status as deduction_status,
        hld.actual_deduction_date,
        hld.is_early_payment,
        hld.payment_notes,
        hld.payment_amount,
        hld.payment_status
      FROM housing_loan hl
      LEFT JOIN housing_loan_deduction hld ON hl.id = hld.loan_id
      WHERE hl.employee_id = $1 AND hl.status IN ('Approved', 'Completed')
      ORDER BY hl.id, hld.deduction_date
    `;

    // Execute all queries in parallel
    const [salaryResult, carResult, housingResult] = await Promise.all([
      query(salaryLoanQuery, [employeeId]),
      query(carLoanQuery, [employeeId]),
      query(housingLoanQuery, [employeeId])
    ]);

    // Process the results to group deductions by loan
    const processResults = (rows: any[], loanType: string) => {
      const loanMap = new Map<number, LoanData>();

      rows.forEach((row) => {
        const loanId = row.id;

        if (!loanMap.has(loanId)) {
          loanMap.set(loanId, {
            id: loanId,
            type: loanType,
            amount: parseFloat(row.amount),
            repaymentTerm: row.repayment_term,
            status: row.status,
            submittedAt: row.submitted_at,
            updatedAt: row.updated_at,
            // Add type-specific fields
            ...(loanType === 'Car Loan' ? {
              carMake: row.car_make,
              carModel: row.car_model,
              carYear: row.car_year
            } : {}),
            ...(loanType === 'Housing Loan' ? {
              propertyType: row.property_type,
              propertyAddress: row.property_address
            } : {}),
            deductions: [],
            payments: [],
            paidAmount: 0,
            remainingAmount: parseFloat(row.amount),
            paidMonths: 0,
            remainingMonths: 0
          });
        }

        if (row.deduction_id) {
          const loan = loanMap.get(loanId)!;
          const scheduledAmount = parseFloat(row.deduction_amount);
          const paymentAmount = row.payment_amount ? parseFloat(row.payment_amount) : null;

          // Add deduction to the loan
          loan.deductions.push({
            id: row.deduction_id,
            deductionDate: row.deduction_date,
            amount: scheduledAmount,
            status: row.deduction_status,
            paymentStatus: row.payment_status,
            actualDeductionDate: row.actual_deduction_date || null,
            isEarlyPayment: row.is_early_payment || false,
            paymentNotes: row.payment_notes || null,
            paymentAmount: paymentAmount
          });
        }
      });

      // Update loans with their payment stats
      loanMap.forEach((loan, id) => {
        // Calculate payment stats for each loan
        loan.paidMonths = loan.deductions.filter(d => d.status === 'Deducted').length;
        loan.remainingMonths = loan.deductions.filter(d => d.status !== 'Deducted' && d.status !== 'Cancelled').length;

        // Calculate paid and remaining amounts
        loan.paidAmount = loan.deductions
          .filter(d => d.status === 'Deducted' || d.status === 'Partially Deducted')
          .reduce((sum, d) => sum + (d.paymentAmount || d.amount), 0);

        // If loan status is "Completed", set remaining amount to 0
        if (loan.status === 'Completed') {
          loan.remainingAmount = 0;
        } else {
          loan.remainingAmount = Math.max(0, loan.amount - (loan.paidAmount || 0));
        }

        // We don't generate payments array here anymore since we'll use the loan_payment_history table
      });

      return Array.from(loanMap.values());
    };

    const salaryLoans = processResults(salaryResult.rows, 'Salary Loan');
    const carLoans = processResults(carResult.rows, 'Car Loan');
    const housingLoans = processResults(housingResult.rows, 'Housing Loan');

    // Combine all loans
    const allLoans = [...salaryLoans, ...carLoans, ...housingLoans];

    // Return the loans without payment transactions (they'll be fetched separately)
    return NextResponse.json({
      success: true,
      loans: allLoans
    });
  } catch (error) {
    console.error("Error fetching loan deductions:", error);
    return NextResponse.json(
      { error: "Failed to fetch loan deductions" },
      { status: 500 }
    );
  }
}