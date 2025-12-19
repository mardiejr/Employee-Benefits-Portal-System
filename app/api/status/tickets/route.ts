// app/api/status/tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from 'qrcode';
import { query } from "../../../utils/database";

async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250
    });
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
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

    // Helper function to get approvers for a level
    const getApproversForLevel = (level: number) => {
      const approvalHierarchy: { [key: number]: { level: number; positions: string[]; label: string } } = {
        1: { level: 1, positions: ['HR Staff', 'HR Manager', 'HR Senior Manager'], label: 'HR' },
        2: { level: 2, positions: ['Supervisor', 'Division Manager'], label: 'Supervisor/Division Manager' },
        3: { level: 3, positions: ['Vice President'], label: 'Vice President' },
        4: { level: 4, positions: ['President'], label: 'President' }
      };
      return approvalHierarchy[level];
    };

    // Fetch medical reimbursements - Updated to include patient_type
    const medicalReimbursementQuery = `
      SELECT 
        mr.id,
        mr.employee_id,
        mr.first_name,
        mr.last_name,
        mr.patient_type,
        mr.admission_date,
        mr.discharge_date,
        mr.total_amount,
        mr.receipt_file_path,
        mr.certificate_file_path,
        mr.status,
        mr.submitted_at,
        mr.updated_at
      FROM medical_reimbursement mr
      WHERE mr.employee_id = $1
      ORDER BY mr.submitted_at DESC
    `;

    const medicalReimbursementResult = await query(medicalReimbursementQuery, [employeeId]);

    // Format medical reimbursement tickets
    const medicalReimbursementTickets = await Promise.all(
      medicalReimbursementResult.rows.map(async (claim: any) => {
        const tokenNumber = `MR-${String(claim.id).padStart(6, '0')}`;

        // Format admission date
        const admissionDate = new Date(claim.admission_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Create description - include patient type info
        const patientTypeText = claim.patient_type === 'inpatient' ? 'in-patient hospital admission' : 'out-patient consultation';
        const description = `Requesting medical reimbursement of ₱${parseFloat(claim.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${patientTypeText} during ${admissionDate}.`;

        // Query approval records from database
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

        // Build approvers list showing all 4 levels
        const approvers = [];
        for (let level = 1; level <= 4; level++) {
          const levelInfo = getApproversForLevel(level);
          const approval = approvalResult.rows.find(a => a.approval_level === level);

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
        const hasRejected = approvalResult.rows.some(a => a.status === 'Rejected');

        if (hasRejected) {
          overallStatus = 'Rejected';
        } else if (claim.status === 'Approved') {
          overallStatus = 'Approved';
        } else {
          overallStatus = 'Pending';
        }

        const comments = approvalResult.rows
          .filter(a => a.comment)
          .map(a => ({
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

        const attachments = [
          {
            id: `receipt-${claim.id}`,
            filename: claim.receipt_file_path.split('/').pop() || 'receipt.pdf',
            url: claim.receipt_file_path,
            size: 'N/A'
          },
          {
            id: `certificate-${claim.id}`,
            filename: claim.certificate_file_path.split('/').pop() || 'certificate.pdf',
            url: claim.certificate_file_path,
            size: 'N/A'
          }
        ];

        return {
          id: `medical-reimbursement-${claim.id}`,
          tokenNumber,
          type: 'Medical Reimbursement',
          title: 'Medical Reimbursement Request',
          description,
          status: overallStatus,
          submittedDate: claim.submitted_at,
          lastUpdated: lastUpdated || claim.submitted_at,
          viewedDate,
          approvalStampedDate,
          attachments,
          approvers,
          comments,
          isPinned: false,
          reimbursementDetails: {
            firstName: claim.first_name,
            lastName: claim.last_name,
            patientType: claim.patient_type || 'outpatient',
            amountClaimed: parseFloat(claim.total_amount),
            admissionDate: claim.admission_date,
            dischargeDate: claim.discharge_date
          }
        };
      })
    );

    // Fetch housing loans for the logged-in employee
    const housingLoanQuery = `
  SELECT 
    hl.id,
    hl.employee_id,
    hl.first_name,
    hl.last_name,
    hl.property_type,
    hl.property_address,
    hl.property_value,
    hl.seller_name,
    hl.comaker_file_path,
    hl.property_documents_file_path,
    hl.loan_amount_requested,
    hl.repayment_term,
    hl.status,
    hl.current_approval_level,
    hl.submitted_at,
    hl.updated_at
  FROM housing_loan hl
  WHERE hl.employee_id = $1
  ORDER BY hl.submitted_at DESC
`;

    const housingLoanResult = await query(housingLoanQuery, [employeeId]);

    // Fetch car loans for the logged-in employee
    const carLoanQuery = `
  SELECT 
    cl.id,
    cl.employee_id,
    cl.first_name,
    cl.last_name,
    cl.car_make,
    cl.car_model,
    cl.car_year,
    cl.vehicle_price,
    cl.dealer_name,
    cl.loan_amount_requested,
    cl.repayment_term,
    cl.comaker_file_path,
    cl.car_quotation_file_path,
    cl.status,
    cl.current_approval_level,
    cl.submitted_at,
    cl.updated_at
  FROM car_loan cl
  WHERE cl.employee_id = $1
  ORDER BY cl.submitted_at DESC
`;

    const carLoanResult = await query(carLoanQuery, [employeeId]);

    // Fetch salary loans for the logged-in employee
    const salaryLoanQuery = `
      SELECT 
        sl.id,
        sl.employee_id,
        sl.first_name,
        sl.last_name,
        sl.position,
        sl.contact_number,
        sl.loan_amount,
        sl.loan_purpose,
        sl.repayment_term,
        sl.monthly_salary,
        sl.comaker_file_path,
        sl.status,
        sl.current_approval_level,
        sl.submitted_at,
        sl.updated_at
      FROM salary_loan sl
      WHERE sl.employee_id = $1
      ORDER BY sl.submitted_at DESC
    `;

    const salaryLoanResult = await query(salaryLoanQuery, [employeeId]);

    // Fetch house bookings for the logged-in employee
    const houseBookingQuery = `
      SELECT 
        hb.id,
        hb.employee_id,
        hb.first_name,
        hb.last_name,
        hb.property_name,
        hb.property_location,
        hb.nature_of_stay,
        hb.reason_for_use,
        hb.checkin_date,
        hb.checkin_time,
        hb.checkout_date,
        hb.checkout_time,
        hb.number_of_guests,
        hb.status,
        hb.current_approval_level,
        hb.submitted_at,
        hb.updated_at
      FROM house_booking hb
      WHERE hb.employee_id = $1
      ORDER BY hb.submitted_at DESC
    `;

    const houseBookingResult = await query(houseBookingQuery, [employeeId]);

    console.log('Medical reimbursements found:', medicalReimbursementResult.rows.length);
    console.log('Salary loans found:', salaryLoanResult.rows.length);
    console.log('Housing loans found:', housingLoanResult.rows.length);
    console.log('Car loans found:', carLoanResult.rows.length);
    console.log('House bookings found:', houseBookingResult.rows.length);

    // Format housing loan tickets
    const housingTickets = await Promise.all(
      housingLoanResult.rows.map(async (loan: any) => {
        const tokenNumber = `HL-${String(loan.id).padStart(6, '0')}`;

        const description = `Requesting a housing loan of ₱${parseFloat(loan.loan_amount_requested).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to purchase a ${loan.property_type.toLowerCase()} property located at ${loan.property_address}, valued at ₱${parseFloat(loan.property_value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. This application is submitted through the company's employee housing assistance program.`;

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

        const approvers = [];
        for (let level = 1; level <= 4; level++) {
          const levelInfo = getApproversForLevel(level);
          const approval = approvalResult.rows.find(a => a.approval_level === level);

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

        let overallStatus = loan.status || 'Pending';
        const hasRejected = approvalResult.rows.some(a => a.status === 'Rejected');

        if (hasRejected) {
          overallStatus = 'Rejected';
        } else if (loan.status === 'Approved') {
          overallStatus = 'Approved';
        } else {
          overallStatus = 'Pending';
        }

        const comments = approvalResult.rows
          .filter(a => a.comment)
          .map(a => ({
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

        const attachments = [
          {
            id: `comaker-${loan.id}`,
            filename: loan.comaker_file_path.split('/').pop() || 'comaker_document.pdf',
            url: loan.comaker_file_path,
            size: 'N/A'
          },
          {
            id: `property-docs-${loan.id}`,
            filename: loan.property_documents_file_path.split('/').pop() || 'property_documents.pdf',
            url: loan.property_documents_file_path,
            size: 'N/A'
          }
        ];

        return {
          id: `housing-${loan.id}`,
          tokenNumber,
          type: 'Housing Loan',
          title: 'Housing Loan Request',
          description,
          status: overallStatus,
          submittedDate: loan.submitted_at,
          lastUpdated: lastUpdated || loan.submitted_at,
          viewedDate,
          approvalStampedDate,
          attachments,
          approvers,
          comments,
          isPinned: false,
          loanDetails: {
            propertyType: loan.property_type,
            propertyAddress: loan.property_address,
            propertyValue: parseFloat(loan.property_value),
            loanAmount: parseFloat(loan.loan_amount_requested),
            repaymentTerm: loan.repayment_term,
            sellerName: loan.seller_name
          }
        };
      })
    );

    // Format car loan tickets
    const carTickets = await Promise.all(
      carLoanResult.rows.map(async (loan: any) => {
        const tokenNumber = `CL-${String(loan.id).padStart(6, '0')}`;

        const description = `Requesting a car loan of ₱${parseFloat(loan.loan_amount_requested).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to purchase a ${loan.car_year} ${loan.car_make} ${loan.car_model} valued at ₱${parseFloat(loan.vehicle_price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. This application is submitted through the company's employee vehicle financing program.`;

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

        const approvers = [];
        for (let level = 1; level <= 4; level++) {
          const levelInfo = getApproversForLevel(level);
          const approval = approvalResult.rows.find(a => a.approval_level === level);

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

        let overallStatus = loan.status || 'Pending';
        const hasRejected = approvalResult.rows.some(a => a.status === 'Rejected');

        if (hasRejected) {
          overallStatus = 'Rejected';
        } else if (loan.status === 'Approved') {
          overallStatus = 'Approved';
        } else {
          overallStatus = 'Pending';
        }

        const comments = approvalResult.rows
          .filter(a => a.comment)
          .map(a => ({
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

        const attachments = [
          {
            id: `comaker-${loan.id}`,
            filename: loan.comaker_file_path.split('/').pop() || 'comaker_document.pdf',
            url: loan.comaker_file_path,
            size: 'N/A'
          },
          {
            id: `quotation-${loan.id}`,
            filename: loan.car_quotation_file_path.split('/').pop() || 'car_quotation.pdf',
            url: loan.car_quotation_file_path,
            size: 'N/A'
          }
        ];

        return {
          id: `car-${loan.id}`,
          tokenNumber,
          type: 'Car Loan',
          title: 'Car Loan Request',
          description,
          status: overallStatus,
          submittedDate: loan.submitted_at,
          lastUpdated: lastUpdated || loan.submitted_at,
          viewedDate,
          approvalStampedDate,
          attachments,
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
            repaymentTerm: loan.repayment_term
          }
        };
      })
    );

    // Format salary loan tickets
    const salaryTickets = await Promise.all(
      salaryLoanResult.rows.map(async (loan: any) => {
        const tokenNumber = `SL-${String(loan.id).padStart(6, '0')}`;

        const description = `Requesting a salary loan of ₱${parseFloat(loan.loan_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${loan.loan_purpose.toLowerCase()}. This salary loan application is submitted through the company's employee loan assistance program.`;

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

        const approvers = [];
        for (let level = 1; level <= 4; level++) {
          const levelInfo = getApproversForLevel(level);
          const approval = approvalResult.rows.find(a => a.approval_level === level);

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

        let overallStatus = loan.status || 'Pending';
        const hasRejected = approvalResult.rows.some(a => a.status === 'Rejected');

        if (hasRejected) {
          overallStatus = 'Rejected';
        } else if (loan.status === 'Approved') {
          overallStatus = 'Approved';
        } else {
          overallStatus = 'Pending';
        }

        const comments = approvalResult.rows
          .filter(a => a.comment)
          .map(a => ({
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

        const attachments = [
          {
            id: `comaker-${loan.id}`,
            filename: loan.comaker_file_path.split('/').pop() || 'comaker_document.pdf',
            url: loan.comaker_file_path,
            size: 'N/A'
          }
        ];

        return {
          id: `salary-${loan.id}`,
          tokenNumber,
          type: 'Salary Loan',
          title: 'Salary Loan Request',
          description,
          status: overallStatus,
          submittedDate: loan.submitted_at,
          lastUpdated: lastUpdated || loan.submitted_at,
          viewedDate,
          approvalStampedDate,
          attachments,
          approvers,
          comments,
          isPinned: false,
          loanDetails: {
            loanAmount: parseFloat(loan.loan_amount),
            loanPurpose: loan.loan_purpose,
            repaymentTerm: loan.repayment_term
          }
        };
      })
    );

    // Format house booking tickets
    const houseBookingTickets = await Promise.all(
      houseBookingResult.rows.map(async (booking: any) => {
        const tokenNumber = `HB-${String(booking.id).padStart(6, '0')}`;

        // Format dates
        const checkinDate = new Date(booking.checkin_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const checkinTime = booking.checkin_time;

        const guestText = booking.number_of_guests > 1
          ? `${booking.number_of_guests - 1} other ${booking.number_of_guests - 1 === 1 ? 'person' : 'people'}`
          : 'no other people';

        const description = `Requesting to book ${booking.property_name} with ${guestText} for ${booking.reason_for_use.toLowerCase()}.`;

        // Query approval records from database
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

        // Build approvers list showing all 4 levels
        const approvers = [];
        for (let level = 1; level <= 4; level++) {
          const levelInfo = getApproversForLevel(level);
          const approval = approvalResult.rows.find(a => a.approval_level === level);

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
        const hasRejected = approvalResult.rows.some(a => a.status === 'Rejected');

        if (hasRejected) {
          overallStatus = 'Rejected';
        } else if (booking.status === 'Approved') {
          overallStatus = 'Approved';
        } else {
          overallStatus = 'Pending';
        }

        const comments = approvalResult.rows
          .filter(a => a.comment)
          .map(a => ({
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

    const medicalLOAQuery = `
     SELECT ml.*, e.first_name, e.last_name, e.position
     FROM medical_loa ml
     JOIN employees e ON ml.employee_id = e.employee_id
     WHERE ml.employee_id = $1
     ORDER BY ml.submitted_at DESC
    `;

    const medicalLOAResult = await query(medicalLOAQuery, [employeeId]);

    // Map the results
    const medicalLOATickets = await Promise.all(
      medicalLOAResult.rows.map(async (loa) => {
        const tokenNumber = `ML-${String(loa.id).padStart(6, '0')}`;
        const visitDate = new Date(loa.visit_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const description = `Requesting LOA requisition at ${loa.hospital_name} for ${loa.patient_complaint}.`;

        const formattedReasonType = loa.reason_type.charAt(0).toUpperCase() + loa.reason_type.slice(1);

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

        // Modified to show only 1 approver level (HR only)
        const approvers = [];
        // Only HR level (level 1)
        const approval = approvalResult.rows.find(a => a.approval_level === 1);
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
            name: 'HR Approval',
            position: 'HR Approval',
            level: 1,
            status: 'Pending',
            timestamp: null,
            comment: null
          });
        }

        // Determine overall status
        let overallStatus = loa.status || 'Pending';
        const hasRejected = approvalResult.rows.some(a => a.status === 'Rejected');

        if (hasRejected) {
          overallStatus = 'Rejected';
        } else if (loa.status === 'Approved') {
          overallStatus = 'Approved';
        } else {
          overallStatus = 'Pending';
        }

        const comments = approvalResult.rows
          .filter(a => a.comment)
          .map(a => ({
            id: a.id.toString(),
            author: `${a.first_name} ${a.middle_name ? a.middle_name.charAt(0) + '. ' : ''}${a.last_name}`,
            role: a.position,
            content: a.comment,
            timestamp: a.approved_at
          }));

        const lastUpdated = approvalResult.rows.length > 0
          ? approvalResult.rows[approvalResult.rows.length - 1].approved_at
          : loa.submitted_at;

        const viewedDate = approvalResult.rows.length > 0
          ? approvalResult.rows[0].approved_at
          : null;

        const approvalStampedDate = overallStatus === 'Approved' || overallStatus === 'Rejected'
          ? approvalResult.rows[approvalResult.rows.length - 1]?.approved_at
          : null;

        // Generate QR code for approved requests
        let qrCode = null;
        if (overallStatus === 'Approved') {
          // Create data for QR code
          const qrData = JSON.stringify({
            tokenNumber,
            hospitalName: loa.hospital_name,
            patientName: `${loa.first_name} ${loa.last_name}`,
            visitDate: loa.visit_date,
            reasonType: loa.reason_type,
            doctor: loa.preferred_doctor,
            approvedBy: approval ? `${approval.first_name} ${approval.last_name}` : 'HR Department',
            approvedAt: approval ? approval.approved_at : null
          });

          // Generate QR code
          qrCode = await generateQRCode(qrData);
        }

        return {
          id: `medical-loa-${loa.id}`,
          tokenNumber,
          type: 'Medical LOA',
          title: 'Medical LOA Request',
          description,
          status: overallStatus,
          submittedDate: loa.submitted_at,
          lastUpdated: lastUpdated || loa.submitted_at,
          viewedDate,
          approvalStampedDate,
          attachments: [], // No attachments for Medical LOA as per requirements
          approvers,
          comments,
          isPinned: false,
          qrCode, // Add QR code for approved requests
          loaDetails: {
            hospitalName: loa.hospital_name,
            hospitalAddress: loa.hospital_address,
            hospitalCity: loa.hospital_city,
            hospitalProvince: loa.hospital_province,
            hospitalRegion: loa.hospital_region,
            visitDate: visitDate,
            reasonType: formattedReasonType,
            patientComplaint: loa.patient_complaint,
            preferredDoctor: loa.preferred_doctor || 'None specified'
          }
        };
      })
    );
    // Combine all tickets
    const allTickets = [...medicalReimbursementTickets, ...housingTickets, ...carTickets, ...salaryTickets, ...houseBookingTickets, ...medicalLOATickets];

    return NextResponse.json({
      success: true,
      tickets: allTickets
    });

  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}