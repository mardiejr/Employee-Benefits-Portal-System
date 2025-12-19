// app/api/admin/loans/deductions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../../utils/database";

interface DeductionData {
    id: number;
    deductionDate: string;
    amount: number;
    status: string;
    actualDeductionDate: string | null;
    isEarlyPayment?: boolean;
    paymentNotes?: string;
    paymentAmount?: number;
    paymentStatus?: string;
}

interface LoanData {
    id: string;
    employeeId: string;
    employeeName: string;
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
    paidAmount: number;
    remainingAmount: number;
    paidMonths: number;
    remainingMonths: number;
}

// GET method to fetch all loans with deductions (for admin view)
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

        console.log("Admin verified, fetching all loans...");

        // Update loan deduction statuses before fetching data
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
            WHERE status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled') AND deduction_date <= CURRENT_DATE;
            
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
            WHERE status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled') AND deduction_date <= CURRENT_DATE;
            
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
            WHERE status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled') AND deduction_date <= CURRENT_DATE;
        `;

        await query(updateStatusesQuery);
        console.log("Updated deduction statuses");

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

        // Fetch all salary loans with their deduction schedules and employee info
        const salaryLoanQuery = `
            SELECT 
                sl.id,
                'Salary Loan' as type,
                sl.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
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
            JOIN employees e ON sl.employee_id = e.employee_id
            LEFT JOIN salary_loan_deduction sld ON sl.id = sld.loan_id
            WHERE sl.status IN ('Approved', 'Completed')
            ORDER BY sl.id, sld.deduction_date
        `;

        // Fetch all car loans with their deduction schedules and employee info
        const carLoanQuery = `
            SELECT 
                cl.id,
                'Car Loan' as type,
                cl.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
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
            JOIN employees e ON cl.employee_id = e.employee_id
            LEFT JOIN car_loan_deduction cld ON cl.id = cld.loan_id
            WHERE cl.status IN ('Approved', 'Completed')
            ORDER BY cl.id, cld.deduction_date
        `;

        // Fetch all housing loans with their deduction schedules and employee info
        const housingLoanQuery = `
            SELECT 
                hl.id,
                'Housing Loan' as type,
                hl.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
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
            JOIN employees e ON hl.employee_id = e.employee_id
            LEFT JOIN housing_loan_deduction hld ON hl.id = hld.loan_id
            WHERE hl.status IN ('Approved', 'Completed')
            ORDER BY hl.id, hld.deduction_date
        `;

        // Execute all queries in parallel
        console.log("Executing loan queries...");
        const [salaryResult, carResult, housingResult] = await Promise.all([
            query(salaryLoanQuery),
            query(carLoanQuery),
            query(housingLoanQuery)
        ]);

        console.log(`Query results: Salary=${salaryResult.rowCount}, Car=${carResult.rowCount}, Housing=${housingResult.rowCount}`);

        // Process the results to group deductions by loan
        const processResults = (rows: any[], loanType: string) => {
            const loanMap = new Map<number, LoanData>();

            rows.forEach((row) => {
                const loanId = row.id;

                if (!loanMap.has(loanId)) {
                    loanMap.set(loanId, {
                        id: loanId.toString(),
                        employeeId: row.employee_id,
                        employeeName: row.employee_name,
                        type: loanType,
                        amount: parseFloat(row.amount),
                        repaymentTerm: row.repayment_term,
                        status: row.status,
                        submittedAt: row.submitted_at,
                        updatedAt: row.updated_at,
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

            // Calculate payment stats for each loan
            loanMap.forEach((loan) => {
                loan.paidMonths = loan.deductions.filter(d => d.status === 'Deducted').length;
                loan.remainingMonths = loan.deductions.filter(d => d.status !== 'Deducted' && d.status !== 'Cancelled').length;

                loan.paidAmount = loan.deductions
                    .filter(d => d.status === 'Deducted' || d.status === 'Partially Deducted')
                    .reduce((sum, d) => sum + (d.paymentAmount || d.amount), 0);

                if (loan.status === 'Completed') {
                    loan.remainingAmount = 0;
                } else {
                    loan.remainingAmount = Math.max(0, loan.amount - loan.paidAmount);
                }
            });

            return Array.from(loanMap.values());
        };

        const salaryLoans = processResults(salaryResult.rows, 'Salary Loan');
        const carLoans = processResults(carResult.rows, 'Car Loan');
        const housingLoans = processResults(housingResult.rows, 'Housing Loan');

        // Combine all loans
        const allLoans = [...salaryLoans, ...carLoans, ...housingLoans];

        console.log(`Successfully processed ${allLoans.length} total loans`);

        return NextResponse.json({
            success: true,
            loans: allLoans
        });
    } catch (error) {
        console.error("Error in GET /api/admin/loans/deductions:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch loans" },
            { status: 500 }
        );
    }
}

// Helper function to get the loan table name based on loan type
function getLoanTableName(loanType: string): string {
    switch (loanType) {
        case 'Salary Loan':
            return 'salary_loan';
        case 'Car Loan':
            return 'car_loan';
        case 'Housing Loan':
            return 'housing_loan';
        default:
            throw new Error("Invalid loan type");
    }
}

// Helper function to get the loan amount column name based on loan type
function getLoanAmountColumnName(loanType: string): string {
    switch (loanType) {
        case 'Salary Loan':
            return 'loan_amount';
        case 'Car Loan':
        case 'Housing Loan':
            return 'loan_amount_requested';
        default:
            throw new Error("Invalid loan type");
    }
}

// Process early payment for a loan deduction (HR admin only)
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

        const data = await req.json();
        const { loanId, loanType, paymentAmount, notes } = data;

        if (!loanId || !loanType || !paymentAmount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const exactPaymentAmount = parseFloat(paymentAmount.toString());
        console.log("PAYMENT AMOUNT FROM USER:", exactPaymentAmount);

        const formattedAmount = exactPaymentAmount.toLocaleString();

        // Determine which table to update based on loan type
        let targetTable = '';
        let targetLoanTable = '';

        switch (loanType) {
            case 'Salary Loan':
                targetTable = 'salary_loan_deduction';
                targetLoanTable = 'salary_loan';
                break;
            case 'Car Loan':
                targetTable = 'car_loan_deduction';
                targetLoanTable = 'car_loan';
                break;
            case 'Housing Loan':
                targetTable = 'housing_loan_deduction';
                targetLoanTable = 'housing_loan';
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid loan type" },
                    { status: 400 }
                );
        }

        // Start a transaction
        await query('BEGIN');

        try {
            const txId = Date.now();
            const paymentNotes = notes
                ? `${notes}`
                : `Early payment of ₱${formattedAmount} processed by admin`;

            const paymentDate = new Date().toISOString();

            console.log(`Processing payment of ${exactPaymentAmount} for loan ${loanId} (${loanType})`);

            // First check if there are partially paid deductions
            const partiallyPaidQuery = `
                SELECT id, amount, payment_amount, deduction_date
                FROM ${targetTable}
                WHERE loan_id = $1 AND status = 'Partially Deducted'
                ORDER BY deduction_date ASC
                LIMIT 1
            `;

            const partiallyPaidResult = await query(partiallyPaidQuery, [loanId]);
            const updatedDeductions = [];

            let remainingPayment = exactPaymentAmount;

            // If there's a partially paid deduction, complete it first
            if (partiallyPaidResult.rowCount > 0) {
                const partial = partiallyPaidResult.rows[0];
                const installmentAmount = parseFloat(partial.amount);
                const alreadyPaid = parseFloat(partial.payment_amount);
                const remainingInstallment = installmentAmount - alreadyPaid;

                console.log(`Found partially paid deduction: ${partial.id}, Amount: ${installmentAmount}, Already paid: ${alreadyPaid}`);

                if (remainingPayment >= remainingInstallment) {
                    const updateQuery = `
                        UPDATE ${targetTable}
                        SET 
                            status = 'Deducted',
                            payment_notes = $1,
                            payment_amount = $2,
                            payment_status = 'Fully Paid'
                        WHERE id = $3
                        RETURNING *
                    `;

                    const result = await query(updateQuery, [
                        paymentNotes,
                        installmentAmount,
                        partial.id
                    ]);

                    console.log(`Completed partially paid deduction ${partial.id}`);
                    updatedDeductions.push(result.rows[0]);
                    remainingPayment -= remainingInstallment;
                } else {
                    const newPaymentAmount = alreadyPaid + remainingPayment;

                    const updateQuery = `
                        UPDATE ${targetTable}
                        SET 
                            payment_notes = $1,
                            payment_amount = $2,
                            payment_status = 'Partially Paid'
                        WHERE id = $3
                        RETURNING *
                    `;

                    const result = await query(updateQuery, [
                        paymentNotes,
                        newPaymentAmount,
                        partial.id
                    ]);

                    console.log(`Added to partially paid deduction ${partial.id}`);
                    updatedDeductions.push(result.rows[0]);
                    remainingPayment = 0;
                }
            }

            // Apply remaining payment to unpaid deductions
            while (remainingPayment > 0) {
                const unpaidDeductionQuery = `
                    SELECT id, deduction_date, amount, status
                    FROM ${targetTable}
                    WHERE loan_id = $1 
                    AND status NOT IN ('Deducted', 'Partially Deducted', 'Cancelled')
                    ORDER BY deduction_date ASC
                    LIMIT 1
                `;

                const unpaidResult = await query(unpaidDeductionQuery, [loanId]);

                if (unpaidResult.rowCount === 0) {
                    console.log(`No more unpaid deductions found`);
                    break;
                }

                const deduction = unpaidResult.rows[0];
                const installmentAmount = parseFloat(deduction.amount);

                if (remainingPayment >= installmentAmount) {
                    const updateQuery = `
                        UPDATE ${targetTable}
                        SET 
                            status = 'Deducted',
                            actual_deduction_date = $1,
                            is_early_payment = true,
                            payment_notes = $2,
                            payment_amount = $3,
                            payment_status = 'Fully Paid'
                        WHERE id = $4
                        RETURNING *
                    `;

                    const result = await query(updateQuery, [
                        paymentDate,
                        paymentNotes,
                        installmentAmount,
                        deduction.id
                    ]);

                    updatedDeductions.push(result.rows[0]);
                    remainingPayment -= installmentAmount;
                } else {
                    const updateQuery = `
                        UPDATE ${targetTable}
                        SET 
                            status = 'Partially Deducted',
                            actual_deduction_date = $1,
                            is_early_payment = true,
                            payment_notes = $2,
                            payment_amount = $3,
                            payment_status = 'Partially Paid'
                        WHERE id = $4
                        RETURNING *
                    `;

                    const result = await query(updateQuery, [
                        paymentDate,
                        paymentNotes,
                        remainingPayment,
                        deduction.id
                    ]);

                    updatedDeductions.push(result.rows[0]);
                    remainingPayment = 0;
                }
            }

            // Check if loan is fully paid
            const loanAmountColumn = getLoanAmountColumnName(loanType);
            const loanQuery = `
                SELECT ${loanAmountColumn} as total_amount
                FROM ${targetLoanTable}
                WHERE id = $1
            `;

            const loanResult = await query(loanQuery, [loanId]);

            if (loanResult.rowCount === 0) {
                await query('ROLLBACK');
                return NextResponse.json(
                    { error: "Loan not found" },
                    { status: 404 }
                );
            }

            const totalLoanAmount = parseFloat(loanResult.rows[0].total_amount);

            const paymentsQuery = `
                SELECT 
                    SUM(COALESCE(payment_amount, amount)) as total_paid
                FROM ${targetTable}
                WHERE 
                    loan_id = $1 AND 
                    (status = 'Deducted' OR status = 'Partially Deducted')
            `;

            const paymentsResult = await query(paymentsQuery, [loanId]);
            const totalPaid = parseFloat(paymentsResult.rows[0].total_paid || '0');

            console.log(`Loan ${loanId}: Total=${totalLoanAmount}, Paid=${totalPaid}`);

            // Mark loan as completed if fully paid
            if (totalPaid >= totalLoanAmount - 0.01) {
                const updateLoanQuery = `
                    UPDATE ${targetLoanTable}
                    SET 
                        status = 'Completed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `;

                await query(updateLoanQuery, [loanId]);
                console.log(`Marked loan ${loanId} as completed`);

                const cancelDeductionsQuery = `
                    UPDATE ${targetTable}
                    SET 
                        status = 'Cancelled',
                        payment_notes = 'Cancelled due to early loan completion'
                    WHERE loan_id = $1 AND status = 'Upcoming'
                `;

                await query(cancelDeductionsQuery, [loanId]);

                await query('COMMIT');

                return NextResponse.json({
                    success: true,
                    message: "Payment processed. Loan fully paid and completed.",
                    updatedDeductions: updatedDeductions,
                    loanCompleted: true
                });
            }

            await query('COMMIT');

            return NextResponse.json({
                success: true,
                message: `Payment of ₱${formattedAmount} processed successfully`,
                updatedDeductions: updatedDeductions
            });

        } catch (error) {
            await query('ROLLBACK');
            console.error("Error processing payment:", error);
            throw error;
        }
    } catch (error) {
        console.error("Error processing payment:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process payment" },
            { status: 500 }
        );
    }
}