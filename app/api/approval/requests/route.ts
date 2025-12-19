// app/api/approval/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool, { query, transaction } from "../../../utils/database";

export async function GET(req: NextRequest) {
  try {
    console.log("API: Starting approval requests handler");

    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Get approver information - use numeric_level instead of approval_level
    const approverQuery = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        e.position,
        a.approval_level as position_title,
        a.numeric_level
      FROM employees e
      JOIN approvers a ON e.employee_id = a.employee_id
      WHERE e.employee_id = $1 AND a.can_approve = true
    `;

    const approverResult = await query(approverQuery, [employeeId]);

    if (approverResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "You do not have approver permissions"
      }, { status: 403 });
    }

    const approver = approverResult.rows[0];
    const approverLevel = approver.numeric_level; // Use numeric_level
    console.log(`API: Approver ${employeeId} has numeric level: ${approverLevel}, position: ${approver.position_title}`);

    // Check if the numeric level is valid
    if (approverLevel === null || approverLevel === undefined) {
      return NextResponse.json({
        success: false,
        error: "Invalid approver level configuration. Please contact administrator."
      }, { status: 400 });
    }

    // Helper function to get approvers for a level
    const getApproversForLevel = (level: number) => {
      const approvalHierarchy: { [key: number]: { level: number; positions: string[]; label: string } } = {
        1: { level: 1, positions: ['HR Staff', 'HR Manager', 'HR Senior Manager'], label: 'HR' },
        2: { level: 2, positions: ['Supervisor', 'Division Manager'], label: 'Supervisor/Division Manager' },
        3: { level: 3, positions: ['Vice President'], label: 'Vice President' },
        4: { level: 4, positions: ['President'], label: 'President' }
      };
      return approvalHierarchy[level] || { level: level, positions: [], label: `Level ${level}` };
    };

    const getApproversForMedicalLOA = (level: number) => {
      switch (level) {
        case 1:
          return { label: 'HR Approval', description: 'Human Resources Department' };
        default:
          return { label: 'Unknown Level', description: 'Unknown' };
      }
    };

    try {
      // MEDICAL REIMBURSEMENT REQUESTS
      const medicalQuery = `
        SELECT 
          mr.*,
          e.position as applicant_position
        FROM medical_reimbursement mr
        JOIN employees e ON mr.employee_id = e.employee_id
        WHERE mr.status = 'Pending' AND mr.current_approval_level = $1::integer
        ORDER BY mr.submitted_at DESC
      `;

      const medicalResult = await query(medicalQuery, [approverLevel]);
      console.log(`API: Found ${medicalResult.rows.length} medical requests`);

      const medicalRequests = await Promise.all(
        medicalResult.rows.map(async (claim: any) => {
          const tokenNumber = `MR-${String(claim.id).padStart(6, '0')}`;

          // Format admission date
          const admissionDate = claim.admission_date
            ? new Date(claim.admission_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })
            : 'N/A';

          // Create description
          const description = `Requesting medical reimbursement of ₱${parseFloat(claim.total_amount || '0').toLocaleString('en-PH',
            { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            } for hospital admission during ${admissionDate}.`;

          // Query approval records
          const approvalQuery = `
            SELECT 
              mra.id,
              mra.approval_level,
              mra.status,
              mra.comment,
              mra.approved_at,
              e.first_name,
              e.middle_name,
              e.last_name,
              a.approval_level as position
            FROM medical_reimbursement_approval mra
            JOIN employees e ON mra.approver_employee_id = e.employee_id
            JOIN approvers a ON mra.approver_employee_id = a.employee_id
            WHERE mra.medical_reimbursement_id = $1
            ORDER BY mra.approval_level
          `;

          const approvalResult = await query(approvalQuery, [claim.id]);

          // Build approvers list
          const approvers = [];
          for (let level = 1; level <= 4; level++) {
            const levelInfo = getApproversForLevel(level);
            const approval = approvalResult.rows.find((a: any) => a.approval_level === level);

            if (approval) {
              // Someone has approved/rejected at this level
              approvers.push({
                name: `${approval.first_name} ${approval.middle_name ? approval.middle_name.charAt(0) + '. ' : ''}${approval.last_name}`,
                position: approval.position,
                level: level,
                status: approval.status,
                timestamp: approval.approved_at,
                comment: approval.comment
              });
            } else {
              // No one has approved yet at this level
              const status = level < claim.current_approval_level ? 'Approved' :
                level === claim.current_approval_level ? 'Pending' :
                  'Pending';

              approvers.push({
                name: levelInfo.label,
                position: levelInfo.label,
                level: level,
                status: status,
                timestamp: null,
                comment: null
              });
            }
          }

          // Determine overall status
          let overallStatus = claim.status || 'Pending';
          const hasRejected = approvalResult.rows.some((a: any) => a.status === 'Rejected');

          if (hasRejected) {
            overallStatus = 'Rejected';
          } else if (claim.status === 'Approved') {
            overallStatus = 'Approved';
          } else {
            overallStatus = 'Pending';
          }

          const comments = approvalResult.rows
            .filter((a: any) => a.comment)
            .map((a: any) => ({
              id: a.id.toString(),
              author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
              role: a.position,
              content: a.comment,
              timestamp: a.approved_at
            }));

          const lastUpdated = approvalResult.rows.length > 0
            ? approvalResult.rows[approvalResult.rows.length - 1].approved_at
            : claim.submitted_at;

          const viewedDate = approvalResult.rows.length > 0
            ? approvalResult.rows[0].approved_at
            : null;

          const approvalStampedDate = overallStatus === 'Approved' || overallStatus === 'Rejected'
            ? approvalResult.rows[approvalResult.rows.length - 1]?.approved_at
            : null;

          return {
            id: `medical-reimbursement-${claim.id}`,
            tokenNumber,
            type: 'Medical Reimbursement',
            title: 'Medical Reimbursement Request',
            applicantName: `${claim.first_name} ${claim.last_name}`,
            applicantPosition: claim.applicant_position,
            amount: parseFloat(claim.total_amount),
            description,
            status: overallStatus,
            submittedDate: claim.submitted_at,
            lastUpdated: lastUpdated || claim.submitted_at,
            viewedDate,
            approvalStampedDate,
            attachments: [
              {
                id: '1',
                filename: 'Medical Receipt',
                url: claim.receipt_file_path,
                size: 'PDF'
              },
              {
                id: '2',
                filename: 'Medical Certificate',
                url: claim.certificate_file_path,
                size: 'PDF'
              }
            ],
            approvers,
            comments,
            isPinned: false,
            medicalDetails: {
              admissionDate: claim.admission_date,
              dischargeDate: claim.discharge_date,
              totalAmount: claim.total_amount
            }
          };
        })
      );

      // HOUSING LOAN REQUESTS
      const housingLoanQuery = `
        SELECT 
          hl.*,
          e.position as applicant_position
        FROM housing_loan hl
        JOIN employees e ON hl.employee_id = e.employee_id
        WHERE hl.status = 'Pending' AND hl.current_approval_level = $1::integer
        ORDER BY hl.submitted_at DESC
      `;

      const housingLoanResult = await query(housingLoanQuery, [approverLevel]);
      console.log(`API: Found ${housingLoanResult.rows.length} housing loan requests`);

      const housingLoanRequests = await Promise.all(
        housingLoanResult.rows.map(async (loan: any) => {
          const tokenNumber = `HL-${String(loan.id).padStart(6, '0')}`;

          // Create description
          const description = `Requesting housing loan of ₱${parseFloat(loan.loan_amount_requested || '0').toLocaleString('en-PH',
            { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            } for a ${loan.property_type.toLowerCase()} property.`;

          // Query approval records
          const approvalQuery = `
            SELECT 
              hla.id,
              hla.approval_level,
              hla.status,
              hla.comment,
              hla.approved_at,
              e.first_name,
              e.middle_name,
              e.last_name,
              a.approval_level as position
            FROM housing_loan_approval hla
            JOIN employees e ON hla.approver_employee_id = e.employee_id
            JOIN approvers a ON hla.approver_employee_id = a.employee_id
            WHERE hla.housing_loan_id = $1
            ORDER BY hla.approval_level
          `;

          const approvalResult = await query(approvalQuery, [loan.id]);

          // Build approvers list
          const approvers = [];
          for (let level = 1; level <= 4; level++) {
            const levelInfo = getApproversForLevel(level);
            const approval = approvalResult.rows.find((a: any) => a.approval_level === level);

            if (approval) {
              approvers.push({
                name: `${approval.first_name} ${approval.middle_name ? approval.middle_name.charAt(0) + '. ' : ''}${approval.last_name}`,
                position: approval.position,
                level: level,
                status: approval.status,
                timestamp: approval.approved_at,
                comment: approval.comment
              });
            } else {
              const status = level < loan.current_approval_level ? 'Approved' :
                level === loan.current_approval_level ? 'Pending' :
                  'Pending';

              approvers.push({
                name: levelInfo.label,
                position: levelInfo.label,
                level: level,
                status: status,
                timestamp: null,
                comment: null
              });
            }
          }

          // Determine overall status
          let overallStatus = loan.status || 'Pending';
          const hasRejected = approvalResult.rows.some((a: any) => a.status === 'Rejected');

          if (hasRejected) {
            overallStatus = 'Rejected';
          } else if (loan.status === 'Approved') {
            overallStatus = 'Approved';
          } else {
            overallStatus = 'Pending';
          }

          const comments = approvalResult.rows
            .filter((a: any) => a.comment)
            .map((a: any) => ({
              id: a.id.toString(),
              author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
              role: a.position,
              content: a.comment,
              timestamp: a.approved_at
            }));

          const lastUpdated = approvalResult.rows.length > 0
            ? approvalResult.rows[approvalResult.rows.length - 1].approved_at
            : loan.submitted_at;

          const viewedDate = approvalResult.rows.length > 0
            ? approvalResult.rows[0].approved_at
            : null;

          const approvalStampedDate = overallStatus === 'Approved' || overallStatus === 'Rejected'
            ? approvalResult.rows[approvalResult.rows.length - 1]?.approved_at
            : null;

          return {
            id: `housing-loan-${loan.id}`,
            tokenNumber,
            type: 'Housing Loan',
            title: 'Housing Loan Application',
            applicantName: `${loan.first_name} ${loan.last_name}`,
            applicantPosition: loan.applicant_position,
            amount: parseFloat(loan.loan_amount_requested),
            description,
            status: overallStatus,
            submittedDate: loan.submitted_at,
            lastUpdated: lastUpdated || loan.submitted_at,
            viewedDate,
            approvalStampedDate,
            attachments: [
              {
                id: '1',
                filename: 'Payslip',
                url: loan.payslip_file_path,
                size: 'PDF'
              },
              {
                id: '2',
                filename: 'Company ID',
                url: loan.company_id_file_path,
                size: 'PDF'
              },
              {
                id: '3',
                filename: 'Property Documents',
                url: loan.property_documents_file_path,
                size: 'PDF'
              }
            ],
            approvers,
            comments,
            isPinned: false,
            loanDetails: {
              propertyType: loan.property_type,
              propertyAddress: loan.property_address,
              propertyValue: parseFloat(loan.property_value),
              loanAmount: parseFloat(loan.loan_amount_requested),
              repaymentTerm: loan.repayment_term,
              monthlySalary: parseFloat(loan.monthly_salary),
              sellerName: loan.seller_name
            }
          };
        })
      );

      // CAR LOAN REQUESTS
      const carLoanQuery = `
        SELECT 
          cl.*,
          e.position as applicant_position
        FROM car_loan cl
        JOIN employees e ON cl.employee_id = e.employee_id
        WHERE cl.status = 'Pending' AND cl.current_approval_level = $1::integer
        ORDER BY cl.submitted_at DESC
      `;

      const carLoanResult = await query(carLoanQuery, [approverLevel]);
      console.log(`API: Found ${carLoanResult.rows.length} car loan requests`);

      const carLoanRequests = await Promise.all(
        carLoanResult.rows.map(async (loan: any) => {
          const tokenNumber = `CL-${String(loan.id).padStart(6, '0')}`;

          // Create description
          const description = `Requesting car loan of ₱${parseFloat(loan.loan_amount_requested || '0').toLocaleString('en-PH',
            { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            } for a ${loan.car_year} ${loan.car_make} ${loan.car_model}.`;

          // Query approval records
          const approvalQuery = `
            SELECT 
              cla.id,
              cla.approval_level,
              cla.status,
              cla.comment,
              cla.approved_at,
              e.first_name,
              e.middle_name,
              e.last_name,
              a.approval_level as position
            FROM car_loan_approval cla
            JOIN employees e ON cla.approver_employee_id = e.employee_id
            JOIN approvers a ON cla.approver_employee_id = a.employee_id
            WHERE cla.car_loan_id = $1
            ORDER BY cla.approval_level
          `;

          const approvalResult = await query(approvalQuery, [loan.id]);

          // Build approvers list and rest of processing (similar to medical and housing)
          const approvers = [];
          for (let level = 1; level <= 4; level++) {
            const levelInfo = getApproversForLevel(level);
            const approval = approvalResult.rows.find((a: any) => a.approval_level === level);

            if (approval) {
              approvers.push({
                name: `${approval.first_name} ${approval.middle_name ? approval.middle_name.charAt(0) + '. ' : ''}${approval.last_name}`,
                position: approval.position,
                level: level,
                status: approval.status,
                timestamp: approval.approved_at,
                comment: approval.comment
              });
            } else {
              const status = level < loan.current_approval_level ? 'Approved' :
                level === loan.current_approval_level ? 'Pending' :
                  'Pending';

              approvers.push({
                name: levelInfo.label,
                position: levelInfo.label,
                level: level,
                status: status,
                timestamp: null,
                comment: null
              });
            }
          }

          // Determine overall status
          let overallStatus = loan.status || 'Pending';
          const hasRejected = approvalResult.rows.some((a: any) => a.status === 'Rejected');

          if (hasRejected) {
            overallStatus = 'Rejected';
          } else if (loan.status === 'Approved') {
            overallStatus = 'Approved';
          } else {
            overallStatus = 'Pending';
          }
          const comments = approvalResult.rows
            .filter((a: any) => a.comment)
            .map((a: any) => ({
              id: a.id.toString(),
              author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
              role: a.position,
              content: a.comment,
              timestamp: a.approved_at
            }));

          const lastUpdated = approvalResult.rows.length > 0
            ? approvalResult.rows[approvalResult.rows.length - 1].approved_at
            : loan.submitted_at;

          const viewedDate = approvalResult.rows.length > 0
            ? approvalResult.rows[0].approved_at
            : null;

          const approvalStampedDate = overallStatus === 'Approved' || overallStatus === 'Rejected'
            ? approvalResult.rows[approvalResult.rows.length - 1]?.approved_at
            : null;

          return {
            id: `car-loan-${loan.id}`,
            tokenNumber,
            type: 'Car Loan',
            title: 'Car Loan Application',
            applicantName: `${loan.first_name} ${loan.last_name}`,
            applicantPosition: loan.applicant_position,
            amount: parseFloat(loan.loan_amount_requested),
            description,
            status: overallStatus,
            submittedDate: loan.submitted_at,
            lastUpdated: lastUpdated || loan.submitted_at,
            viewedDate,
            approvalStampedDate,
            attachments: [
              {
                id: '1',
                filename: 'Payslip',
                url: loan.payslip_file_path,
                size: 'PDF'
              },
              {
                id: '2',
                filename: 'Company ID',
                url: loan.company_id_file_path,
                size: 'PDF'
              },
              {
                id: '3',
                filename: 'Car Quotation',
                url: loan.car_quotation_file_path,
                size: 'PDF'
              }
            ],
            approvers,
            comments,
            isPinned: false,
            loanDetails: {
              carMake: loan.car_make,
              carModel: loan.car_model,
              carYear: loan.car_year,
              vehiclePrice: parseFloat(loan.vehicle_price),
              dealerName: loan.dealer_name,
              loanAmount: parseFloat(loan.loan_amount_requested),
              repaymentTerm: loan.repayment_term,
              monthlySalary: parseFloat(loan.monthly_salary)
            }
          };
        })
      );

      // SALARY LOAN REQUESTS
      const salaryLoanQuery = `
        SELECT 
          sl.*,
          e.position as applicant_position
        FROM salary_loan sl
        JOIN employees e ON sl.employee_id = e.employee_id
        WHERE sl.status = 'Pending' AND sl.current_approval_level = $1::integer
        ORDER BY sl.submitted_at DESC
      `;

      const salaryLoanResult = await query(salaryLoanQuery, [approverLevel]);
      console.log(`API: Found ${salaryLoanResult.rows.length} salary loan requests`);

      const salaryLoanRequests = await Promise.all(
        salaryLoanResult.rows.map(async (loan: any) => {
          const tokenNumber = `SL-${String(loan.id).padStart(6, '0')}`;

          // Create description
          const description = `Requesting salary loan of ₱${parseFloat(loan.loan_amount || '0').toLocaleString('en-PH',
            { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            } for ${loan.loan_purpose.toLowerCase()}.`;

          // Query approval records
          const approvalQuery = `
            SELECT 
              sla.id,
              sla.approval_level,
              sla.status,
              sla.comment,
              sla.approved_at,
              e.first_name,
              e.middle_name,
              e.last_name,
              a.approval_level as position
            FROM salary_loan_approval sla
            JOIN employees e ON sla.approver_employee_id = e.employee_id
            JOIN approvers a ON sla.approver_employee_id = a.employee_id
            WHERE sla.salary_loan_id = $1
            ORDER BY sla.approval_level
          `;

          const approvalResult = await query(approvalQuery, [loan.id]);

          // Build approvers list
          const approvers = [];
          for (let level = 1; level <= 4; level++) {
            const levelInfo = getApproversForLevel(level);
            const approval = approvalResult.rows.find((a: any) => a.approval_level === level);

            if (approval) {
              approvers.push({
                name: `${approval.first_name} ${approval.middle_name ? approval.middle_name.charAt(0) + '. ' : ''}${approval.last_name}`,
                position: approval.position,
                level: level,
                status: approval.status,
                timestamp: approval.approved_at,
                comment: approval.comment
              });
            } else {
              const status = level < loan.current_approval_level ? 'Approved' :
                level === loan.current_approval_level ? 'Pending' :
                  'Pending';

              approvers.push({
                name: levelInfo.label,
                position: levelInfo.label,
                level: level,
                status: status,
                timestamp: null,
                comment: null
              });
            }
          }

          // Determine overall status
          let overallStatus = loan.status || 'Pending';
          const hasRejected = approvalResult.rows.some((a: any) => a.status === 'Rejected');

          if (hasRejected) {
            overallStatus = 'Rejected';
          } else if (loan.status === 'Approved') {
            overallStatus = 'Approved';
          } else {
            overallStatus = 'Pending';
          }

          const comments = approvalResult.rows
            .filter((a: any) => a.comment)
            .map((a: any) => ({
              id: a.id.toString(),
              author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
              role: a.position,
              content: a.comment,
              timestamp: a.approved_at
            }));

          const lastUpdated = approvalResult.rows.length > 0
            ? approvalResult.rows[approvalResult.rows.length - 1].approved_at
            : loan.submitted_at;

          const viewedDate = approvalResult.rows.length > 0
            ? approvalResult.rows[0].approved_at
            : null;

          const approvalStampedDate = overallStatus === 'Approved' || overallStatus === 'Rejected'
            ? approvalResult.rows[approvalResult.rows.length - 1]?.approved_at
            : null;

          return {
            id: `salary-loan-${loan.id}`,
            tokenNumber,
            type: 'Salary Loan',
            title: 'Salary Loan Application',
            applicantName: `${loan.first_name} ${loan.last_name}`,
            applicantPosition: loan.applicant_position,
            amount: parseFloat(loan.loan_amount),
            description,
            status: overallStatus,
            submittedDate: loan.submitted_at,
            lastUpdated: lastUpdated || loan.submitted_at,
            viewedDate,
            approvalStampedDate,
            attachments: [
              {
                id: '1',
                filename: 'Payslip',
                url: loan.payslip_file_path,
                size: 'PDF'
              },
              {
                id: '2',
                filename: 'Company ID',
                url: loan.company_id_file_path,
                size: 'PDF'
              }
            ],
            approvers,
            comments,
            isPinned: false,
            loanDetails: {
              loanPurpose: loan.loan_purpose,
              loanAmount: parseFloat(loan.loan_amount),
              repaymentTerm: loan.repayment_term,
              monthlySalary: parseFloat(loan.monthly_salary),
              contactNumber: loan.contact_number
            }
          };
        })
      );

      // HOUSE BOOKING REQUESTS
      const houseBookingQuery = `
        SELECT 
          hb.*,
          e.position as applicant_position
        FROM house_booking hb
        JOIN employees e ON hb.employee_id = e.employee_id
        WHERE hb.status = 'Pending' AND hb.current_approval_level = $1::integer
        ORDER BY hb.submitted_at DESC
      `;

      const houseBookingResult = await query(houseBookingQuery, [approverLevel]);
      console.log(`API: Found ${houseBookingResult.rows.length} house booking requests`);

      const houseBookingRequests = await Promise.all(
        houseBookingResult.rows.map(async (booking: any) => {
          const tokenNumber = `HB-${String(booking.id).padStart(6, '0')}`;

          const guestText = booking.number_of_guests > 1
            ? `${booking.number_of_guests - 1} other ${booking.number_of_guests - 1 === 1 ? 'person' : 'people'}`
            : 'no other people';

          const description = `Requesting to book ${booking.property_name} with ${guestText} for ${booking.reason_for_use.toLowerCase()}.`;

          const approvalQuery = `
            SELECT 
              hba.id,
              hba.approval_level,
              hba.status,
              hba.comment,
              hba.approved_at,
              e.first_name,
              e.middle_name,
              e.last_name,
              a.approval_level as position
            FROM house_booking_approval hba
            JOIN employees e ON hba.approver_employee_id = e.employee_id
            JOIN approvers a ON hba.approver_employee_id = a.employee_id
            WHERE hba.house_booking_id = $1
            ORDER BY hba.approval_level
          `;

          const approvalResult = await query(approvalQuery, [booking.id]);

          // Build approvers list
          const approvers = [];
          for (let level = 1; level <= 2; level++) {
            const levelInfo = getApproversForLevel(level);
            const approval = approvalResult.rows.find((a: any) => a.approval_level === level);

            if (approval) {
              approvers.push({
                name: `${approval.first_name} ${approval.middle_name ? approval.middle_name.charAt(0) + '. ' : ''}${approval.last_name}`,
                position: approval.position,
                level: level,
                status: approval.status,
                timestamp: approval.approved_at,
                comment: approval.comment
              });
            } else {
              const status = level < booking.current_approval_level ? 'Approved' :
                level === booking.current_approval_level ? 'Pending' :
                  'Pending';

              approvers.push({
                name: levelInfo.label,
                position: levelInfo.label,
                level: level,
                status: status,
                timestamp: null,
                comment: null
              });
            }
          }

          // Determine overall status
          let overallStatus = booking.status || 'Pending';
          const hasRejected = approvalResult.rows.some((a: any) => a.status === 'Rejected');

          if (hasRejected) {
            overallStatus = 'Rejected';
          } else if (booking.status === 'Approved') {
            overallStatus = 'Approved';
          } else {
            overallStatus = 'Pending';
          }

          const comments = approvalResult.rows
            .filter((a: any) => a.comment)
            .map((a: any) => ({
              id: a.id.toString(),
              author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
              role: a.position,
              content: a.comment,
              timestamp: a.approved_at
            }));

          const lastUpdated = approvalResult.rows.length > 0
            ? approvalResult.rows[approvalResult.rows.length - 1].approved_at
            : booking.submitted_at;

          const viewedDate = approvalResult.rows.length > 0
            ? approvalResult.rows[0].approved_at
            : null;

          const approvalStampedDate = overallStatus === 'Approved' || overallStatus === 'Rejected'
            ? approvalResult.rows[approvalResult.rows.length - 1]?.approved_at
            : null;

          return {
            id: `house-booking-${booking.id}`,
            tokenNumber,
            type: 'House Booking',
            title: 'Staffhouse Booking Request',
            applicantName: `${booking.first_name} ${booking.last_name}`,
            applicantPosition: booking.applicant_position,
            description,
            status: overallStatus,
            submittedDate: booking.submitted_at,
            lastUpdated: lastUpdated || booking.submitted_at,
            viewedDate,
            approvalStampedDate,
            attachments: [],
            approvers,
            comments,
            isPinned: false,
            bookingDetails: {
              firstName: booking.first_name,
              lastName: booking.last_name,
              propertyName: booking.property_name,
              propertyLocation: booking.property_location,
              numberOfGuests: booking.number_of_guests,
              checkinDate: booking.checkin_date,
              checkinTime: booking.checkin_time,
              checkoutDate: booking.checkout_date,
              checkoutTime: booking.checkout_time,
              natureOfStay: booking.nature_of_stay,
              reasonForUse: booking.reason_for_use
            }
          };
        })
      );

      // MEDICAL LOA REQUESTS
      const medicalLoaQuery = `
        SELECT 
          ml.*,
          e.position AS applicant_position
        FROM medical_loa ml
        JOIN employees e ON ml.employee_id = e.employee_id
        WHERE ml.status = 'Pending' 
        AND ml.current_approval_level = $1::integer
        ORDER BY ml.submitted_at DESC
      `;

      const medicalLoaResult = await query(medicalLoaQuery, [approverLevel]);
      console.log(`API: Found ${medicalLoaResult.rows.length} medical LOA requests`);

      const medicalLoaRequests = await Promise.all(
        medicalLoaResult.rows.map(async (loa: any) => {
          const tokenNumber = `ML-${String(loa.id).padStart(6, '0')}`;
          const description = `Requesting medical leave of absence at ${loa.hospital_name || 'N/A'} for ${loa.reason || 'medical reasons'}.`;

          const approvalQuery = `
            SELECT 
              mla.id,
              mla.approval_level,
              mla.status,
              mla.comment,
              mla.approved_at,
              e.first_name,
              e.middle_name,
              e.last_name,
              a.approval_level as position
            FROM medical_loa_approval mla
            JOIN employees e ON mla.approver_employee_id = e.employee_id
            JOIN approvers a ON mla.approver_employee_id = a.employee_id
            WHERE mla.medical_loa_id = $1
            ORDER BY mla.approval_level
          `;

          const approvalResult = await query(approvalQuery, [loa.id]);

          const approvers = [];
          // Only add HR approver for Medical LOA (level 1)
          const levelInfo = getApproversForLevel(1);
          const approval = approvalResult.rows.find((a: any) => a.approval_level === 1);

          if (approval) {
            approvers.push({
              name: `${approval.first_name} ${approval.middle_name ? approval.middle_name.charAt(0) + '. ' : ''}${approval.last_name}`,
              position: approval.position,
              level: 1,
              status: approval.status,
              timestamp: approval.approved_at,
              comment: approval.comment
            });
          } else {
            approvers.push({
              name: levelInfo.label,
              position: levelInfo.label,
              level: 1,
              status: 'Pending',
              timestamp: null,
              comment: null
            });
          }

          const comments = approvalResult.rows
            .filter((a: any) => a.comment)
            .map((a: any) => ({
              id: a.id.toString(),
              author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
              role: a.position,
              content: a.comment,
              timestamp: a.approved_at
            }));

          return {
            id: `medical-loa-${loa.id}`,
            tokenNumber,
            type: 'Medical LOA',
            title: 'Medical Leave of Absence Request',
            applicantName: `${loa.first_name} ${loa.last_name}`,
            applicantPosition: loa.applicant_position,
            description,
            status: loa.status,
            submittedDate: loa.submitted_at || new Date().toISOString(),
            lastUpdated: loa.updated_at || loa.submitted_at || new Date().toISOString(),
            approvers,
            comments,
            isPinned: false,
            loaDetails: {
              hospitalName: loa.hospital_name || 'N/A',
              hospitalAddress: loa.hospital_address || 'N/A',
              hospitalCity: loa.hospital_city || 'N/A',
              hospitalProvince: loa.hospital_province || 'N/A',
              hospitalRegion: loa.hospital_region || 'N/A',
              visitDate: loa.visit_date || null,
              reasonType: loa.reason_type || 'N/A',
              patientComplaint: loa.patient_complaint || 'N/A',
              preferredDoctor: loa.preferred_doctor || 'N/A'
            }
          };
        })
      );

      const allRequests = [
        ...medicalRequests,
        ...medicalLoaRequests,
        ...housingLoanRequests,
        ...carLoanRequests,
        ...salaryLoanRequests,
        ...houseBookingRequests
      ];

      console.log(`API: Total requests found: ${allRequests.length}`);

      return NextResponse.json({
        success: true,
        requests: allRequests
      });
    } catch (error: any) {
      console.error("Error processing requests:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("Error fetching approval requests:", error);
    return NextResponse.json(
      { error: `Failed to fetch approval requests: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}