// app/api/admin/dashboard-stats/route.ts

import { NextResponse } from "next/server";
import pool, { query, transaction } from "../../../utils/database";

export async function GET() {
  try {
    // Get total employees count
    const totalEmployeesQuery = `
      SELECT COUNT(*) as count 
      FROM employees 
      WHERE is_active = true
    `;
    const totalEmployeesResult = await query(totalEmployeesQuery);
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].count);

    // Get active employees (employees who are active and not on leave)
    // In the database, is_active is a boolean flag, and the application maps it to "Active"/"Inactive" for display
    // This is different from "On Leave" status which is set in the frontend
    // We'll count only the active employees for this stat
    const activeEmployeesQuery = `
      SELECT COUNT(*) as count 
      FROM employees 
      WHERE is_active = true
    `;
    const activeEmployeesResult = await query(activeEmployeesQuery);
    const activeEmployees = parseInt(activeEmployeesResult.rows[0].count);

    // Get pending requests count (loans + medical reimbursements + medical LOA + staff house bookings)
    const pendingRequestsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM salary_loan WHERE status = 'Pending') +
        (SELECT COUNT(*) FROM housing_loan WHERE status = 'Pending') +
        (SELECT COUNT(*) FROM car_loan WHERE status = 'Pending') +
        (SELECT COUNT(*) FROM medical_reimbursement WHERE status = 'Pending') +
        (SELECT COUNT(*) FROM medical_loa WHERE status = 'Pending') +
        (SELECT COUNT(*) FROM house_booking WHERE status = 'Pending')
        as count
    `;
    const pendingRequestsResult = await query(pendingRequestsQuery);
    const pendingRequests = parseInt(pendingRequestsResult.rows[0].count);

    // Get active loans total amount
    const activeLoansQuery = `
      SELECT 
        COALESCE(SUM(loan_amount), 0) as salary_total,
        (SELECT COALESCE(SUM(loan_amount_requested), 0) FROM housing_loan WHERE status = 'Approved') as housing_total,
        (SELECT COALESCE(SUM(loan_amount_requested), 0) FROM car_loan WHERE status = 'Approved') as car_total,
        (SELECT COALESCE(SUM(total_amount), 0) FROM medical_reimbursement WHERE status = 'Approved') as medical_total
      FROM salary_loan 
      WHERE status = 'Approved'
    `;
    const activeLoansResult = await query(activeLoansQuery);
    const loanData = activeLoansResult.rows[0];
    const activeLoansTotal = 
      parseFloat(loanData.salary_total || 0) + 
      parseFloat(loanData.housing_total || 0) + 
      parseFloat(loanData.car_total || 0) + 
      parseFloat(loanData.medical_total || 0);

    // Get recent requests (last 5 of each type, including medical LOA and staff house bookings)
    const recentRequestsQuery = `
      (SELECT 
        'Salary Loan' as type,
        CONCAT(first_name, ' ', last_name) as employee,
        status,
        submitted_at
      FROM salary_loan
      ORDER BY submitted_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'Housing Loan' as type,
        CONCAT(first_name, ' ', last_name) as employee,
        status,
        submitted_at
      FROM housing_loan
      ORDER BY submitted_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'Car Loan' as type,
        CONCAT(first_name, ' ', last_name) as employee,
        status,
        submitted_at
      FROM car_loan
      ORDER BY submitted_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'Medical Reimbursement' as type,
        CONCAT(first_name, ' ', last_name) as employee,
        status,
        submitted_at
      FROM medical_reimbursement
      ORDER BY submitted_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'Medical LOA' as type,
        CONCAT(first_name, ' ', last_name) as employee,
        status,
        submitted_at
      FROM medical_loa
      ORDER BY submitted_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'Staff House Booking' as type,
        CONCAT(first_name, ' ', last_name) as employee,
        status,
        submitted_at
      FROM house_booking
      ORDER BY submitted_at DESC
      LIMIT 5)
      
      ORDER BY submitted_at DESC
      LIMIT 10
    `;
    const recentRequestsResult = await query(recentRequestsQuery);
    const recentRequests = recentRequestsResult.rows;

    return NextResponse.json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        pendingRequests,
        activeLoansTotal: activeLoansTotal.toFixed(2)
      },
      recentRequests
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}