// app/api/admin/benefit-stats/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool, { query, transaction } from "../../../utils/database";

export async function GET() {
  try {
    // Verify admin authorization from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const employeeCheckQuery = `
      SELECT role_class 
      FROM employees 
      WHERE employee_id = $1 AND is_active = true
    `;
    const employeeCheck = await query(employeeCheckQuery, [employeeId]);

    if (employeeCheck.rows.length === 0 || !employeeCheck.rows[0].role_class.startsWith('Class A')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    // Initialize results
    let benefitUtilization = [];
    let approvalStats = [];
    let processingTimes = [];

    // 1. Benefit Utilization - Get counts for all benefit types
    
    // 1.1 Medical LOA
    try {
      const medicalLoaQuery = `
        SELECT 
          'Medical LOA' as benefit_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 END) as pending_count
        FROM medical_loa
      `;
      const loaResult = await query(medicalLoaQuery);
      if (loaResult.rows.length > 0) {
        benefitUtilization.push(loaResult.rows[0]);
      }
    } catch (err) {
      console.error("Error querying medical_loa:", err);
    }
    
    // 1.2 Medical Reimbursement
    try {
      const medicalReimbursementQuery = `
        SELECT 
          'Medical Reimbursement' as benefit_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 END) as pending_count
        FROM medical_reimbursement
      `;
      const reimbursementResult = await query(medicalReimbursementQuery);
      if (reimbursementResult.rows.length > 0) {
        benefitUtilization.push(reimbursementResult.rows[0]);
      }
    } catch (err) {
      console.error("Error querying medical_reimbursement:", err);
    }
    
    // 1.3 Salary Loan
    try {
      const salaryLoanQuery = `
        SELECT 
          'Salary Loan' as benefit_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 END) as pending_count
        FROM salary_loan
      `;
      const salaryLoanResult = await query(salaryLoanQuery);
      if (salaryLoanResult.rows.length > 0) {
        benefitUtilization.push(salaryLoanResult.rows[0]);
      }
    } catch (err) {
      console.error("Error querying salary_loan:", err);
    }
    
    // 1.4 Housing Loan
    try {
      const housingLoanQuery = `
        SELECT 
          'Housing Loan' as benefit_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 END) as pending_count
        FROM housing_loan
      `;
      const housingLoanResult = await query(housingLoanQuery);
      if (housingLoanResult.rows.length > 0) {
        benefitUtilization.push(housingLoanResult.rows[0]);
      }
    } catch (err) {
      console.error("Error querying housing_loan:", err);
    }
    
    // 1.5 Car Loan
    try {
      const carLoanQuery = `
        SELECT 
          'Car Loan' as benefit_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN status = 'Pending' OR status = 'Processing' THEN 1 END) as pending_count
        FROM car_loan
      `;
      const carLoanResult = await query(carLoanQuery);
      if (carLoanResult.rows.length > 0) {
        benefitUtilization.push(carLoanResult.rows[0]);
      }
    } catch (err) {
      console.error("Error querying car_loan:", err);
    }
    
    // 2. Approval Statistics - Get pending requests by approval level
    const approvalQueries = [];
    
    // 2.1 Medical LOA Approval Stats
    try {
      const medicalLoaApprovalQuery = `
        SELECT 
          current_approval_level,
          COUNT(*) as count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_days_in_level
        FROM medical_loa
        WHERE status = 'Pending' 
        GROUP BY current_approval_level
      `;
      
      const loaApprovalResult = await query(medicalLoaApprovalQuery);
      if (loaApprovalResult.rows.length > 0) {
        approvalStats = [...approvalStats, ...loaApprovalResult.rows];
      }
    } catch (err) {
      console.error("Error querying medical_loa approval stats:", err);
    }
    
    // 2.2 Medical Reimbursement Approval Stats
    try {
      const reimbursementApprovalQuery = `
        SELECT 
          current_approval_level,
          COUNT(*) as count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_days_in_level
        FROM medical_reimbursement
        WHERE status = 'Pending' 
        GROUP BY current_approval_level
      `;
      
      const reimbApprovalResult = await query(reimbursementApprovalQuery);
      if (reimbApprovalResult.rows.length > 0) {
        approvalStats = [...approvalStats, ...reimbApprovalResult.rows];
      }
    } catch (err) {
      console.error("Error querying medical_reimbursement approval stats:", err);
    }
    
    // 2.3 Loan Approval Stats (Salary, Housing, Car)
    try {
      const loanApprovalQuery = `
        SELECT 
          current_approval_level,
          COUNT(*) as count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_days_in_level
        FROM (
          SELECT current_approval_level, updated_at, submitted_at FROM salary_loan WHERE status = 'Pending'
          UNION ALL
          SELECT current_approval_level, updated_at, submitted_at FROM housing_loan WHERE status = 'Pending'
          UNION ALL
          SELECT current_approval_level, updated_at, submitted_at FROM car_loan WHERE status = 'Pending'
        ) as pending_loans
        GROUP BY current_approval_level
      `;
      
      const loanApprovalResult = await query(loanApprovalQuery);
      if (loanApprovalResult.rows.length > 0) {
        approvalStats = [...approvalStats, ...loanApprovalResult.rows];
      }
    } catch (err) {
      console.error("Error querying loan approval stats:", err);
    }
    
    // Combine and aggregate approval stats by level
    const combinedApprovalStats = [];
    const approvalLevels = [...new Set(approvalStats.map(stat => parseInt(stat.current_approval_level)))];
    
    for (const level of approvalLevels) {
      const levelStats = approvalStats.filter(stat => parseInt(stat.current_approval_level) === level);
      
      if (levelStats.length > 0) {
        const totalCount = levelStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
        const weightedAvgDays = levelStats.reduce((sum, stat) => {
          return sum + (parseFloat(stat.avg_days_in_level) * parseInt(stat.count));
        }, 0) / totalCount;
        
        combinedApprovalStats.push({
          current_approval_level: level,
          count: totalCount,
          avg_days_in_level: Math.max(0.1, weightedAvgDays).toFixed(1)
        });
      }
    }
    
    // Sort by approval level
    combinedApprovalStats.sort((a, b) => a.current_approval_level - b.current_approval_level);
    
    // 3. Processing Times - Get average time for completed requests
    
    // 3.1 Medical LOA Processing Times
    try {
      const medicalLoaProcessingQuery = `
        SELECT 
          'Medical LOA' as benefit_type,
          COUNT(*) as completed_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_processing_days
        FROM medical_loa
        WHERE status IN ('Approved', 'Rejected')
      `;
      
      const loaProcessingResult = await query(medicalLoaProcessingQuery);
      if (loaProcessingResult.rows.length > 0 && parseInt(loaProcessingResult.rows[0].completed_count) > 0) {
        processingTimes.push({
          ...loaProcessingResult.rows[0],
          avg_processing_days: Math.max(0.1, parseFloat(loaProcessingResult.rows[0].avg_processing_days)).toFixed(1)
        });
      }
    } catch (err) {
      console.error("Error querying medical_loa processing times:", err);
    }
    
    // 3.2 Medical Reimbursement Processing Times
    try {
      const reimbursementProcessingQuery = `
        SELECT 
          'Medical Reimbursement' as benefit_type,
          COUNT(*) as completed_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_processing_days
        FROM medical_reimbursement
        WHERE status IN ('Approved', 'Rejected')
      `;
      
      const reimbProcessingResult = await query(reimbursementProcessingQuery);
      if (reimbProcessingResult.rows.length > 0 && parseInt(reimbProcessingResult.rows[0].completed_count) > 0) {
        processingTimes.push({
          ...reimbProcessingResult.rows[0],
          avg_processing_days: Math.max(0.1, parseFloat(reimbProcessingResult.rows[0].avg_processing_days)).toFixed(1)
        });
      }
    } catch (err) {
      console.error("Error querying medical_reimbursement processing times:", err);
    }
    
    // 3.3 Salary Loan Processing Times
    try {
      const salaryLoanProcessingQuery = `
        SELECT 
          'Salary Loan' as benefit_type,
          COUNT(*) as completed_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_processing_days
        FROM salary_loan
        WHERE status IN ('Approved', 'Rejected')
      `;
      
      const salaryProcessingResult = await query(salaryLoanProcessingQuery);
      if (salaryProcessingResult.rows.length > 0 && parseInt(salaryProcessingResult.rows[0].completed_count) > 0) {
        processingTimes.push({
          ...salaryProcessingResult.rows[0],
          avg_processing_days: Math.max(0.1, parseFloat(salaryProcessingResult.rows[0].avg_processing_days)).toFixed(1)
        });
      }
    } catch (err) {
      console.error("Error querying salary_loan processing times:", err);
    }
    
    // 3.4 Housing Loan Processing Times
    try {
      const housingLoanProcessingQuery = `
        SELECT 
          'Housing Loan' as benefit_type,
          COUNT(*) as completed_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_processing_days
        FROM housing_loan
        WHERE status IN ('Approved', 'Rejected')
      `;
      
      const housingProcessingResult = await query(housingLoanProcessingQuery);
      if (housingProcessingResult.rows.length > 0 && parseInt(housingProcessingResult.rows[0].completed_count) > 0) {
        processingTimes.push({
          ...housingProcessingResult.rows[0],
          avg_processing_days: Math.max(0.1, parseFloat(housingProcessingResult.rows[0].avg_processing_days)).toFixed(1)
        });
      }
    } catch (err) {
      console.error("Error querying housing_loan processing times:", err);
    }
    
    // 3.5 Car Loan Processing Times
    try {
      const carLoanProcessingQuery = `
        SELECT 
          'Car Loan' as benefit_type,
          COUNT(*) as completed_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 86400), 0.1) as avg_processing_days
        FROM car_loan
        WHERE status IN ('Approved', 'Rejected')
      `;
      
      const carProcessingResult = await query(carLoanProcessingQuery);
      if (carProcessingResult.rows.length > 0 && parseInt(carProcessingResult.rows[0].completed_count) > 0) {
        processingTimes.push({
          ...carProcessingResult.rows[0],
          avg_processing_days: Math.max(0.1, parseFloat(carProcessingResult.rows[0].avg_processing_days)).toFixed(1)
        });
      }
    } catch (err) {
      console.error("Error querying car_loan processing times:", err);
    }
    
    // Sort processing times by completed_count descending
    processingTimes.sort((a, b) => parseInt(b.completed_count) - parseInt(a.completed_count));
    
    return NextResponse.json({
      success: true,
      benefitUtilization,
      approvalStats: combinedApprovalStats,
      processingTimes
    });
    
  } catch (error) {
    console.error("Error fetching benefit statistics:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch benefit statistics"
    }, { status: 500 });
  }
}