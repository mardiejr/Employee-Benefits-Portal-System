// app/api/approval/[requestType]/[action]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { 
  createApprovalNotification,
  createApproverNotification 
} from "../../../../utils/notification-util";
import QRCode from 'qrcode';
import pool, { query, transaction } from "../../../../utils/database";

export async function POST(
  req: NextRequest,  // Changed from request to req
  { params }: { params: { requestType: string; action: string } }
) {
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const { requestType, action } = params;
    const bodyData = await req.json();  // Changed from request to req
    const { id, comment } = bodyData;

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Validate action
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // If action is reject, comment is required
    if (action === 'reject' && (!comment || comment.trim().length < 5)) {
      return NextResponse.json(
        { error: "A detailed reason is required for rejection (at least 5 characters)" },
        { status: 400 }
      );
    }

    // Get approver information - Use numeric_level instead of approval_level
    const approverQuery = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        e.position,
        a.approval_level as position_title,
        a.numeric_level as approval_level
      FROM employees e
      JOIN approvers a ON e.employee_id = a.employee_id
      WHERE e.employee_id = $1 AND a.can_approve = true
    `;

    const approverResult = await query(approverQuery, [employeeId]);

    if (approverResult.rows.length === 0) {
      return NextResponse.json(
        { error: "You do not have approval privileges" },
        { status: 403 }
      );
    }

    const approver = approverResult.rows[0];
    const approverLevel = approver.approval_level;

    // Make sure approverLevel is defined and is a number
    if (approverLevel === null || approverLevel === undefined) {
      return NextResponse.json(
        { error: "Invalid approver level configuration. Please contact administrator." },
        { status: 400 }
      );
    }

    console.log(`API: Approver ${employeeId} has level ${approverLevel} attempting to ${action} ${requestType} ID ${id}`);

    // Determine table names based on request type
    let requestTable, approvalTable, requestIdColumn;
    switch (requestType) {
      case 'medical-reimbursement':
        requestTable = 'medical_reimbursement';
        approvalTable = 'medical_reimbursement_approval';
        requestIdColumn = 'medical_reimbursement_id';
        break;
      case 'medical-loa':
        requestTable = 'medical_loa';
        approvalTable = 'medical_loa_approval';
        requestIdColumn = 'medical_loa_id';
        break;
      case 'housing-loan':
        requestTable = 'housing_loan';
        approvalTable = 'housing_loan_approval';
        requestIdColumn = 'housing_loan_id';
        break;
      case 'car-loan':
        requestTable = 'car_loan';
        approvalTable = 'car_loan_approval';
        requestIdColumn = 'car_loan_id';
        break;
      case 'salary-loan':
        requestTable = 'salary_loan';
        approvalTable = 'salary_loan_approval';
        requestIdColumn = 'salary_loan_id';
        break;
      case 'house-booking':
        requestTable = 'house_booking';
        approvalTable = 'house_booking_approval';
        requestIdColumn = 'house_booking_id';
        break;
      default:
        return NextResponse.json(
          { error: "Invalid request type" },
          { status: 400 }
        );
    }

    // Get the current state of the request
    // For medical reimbursement, also fetch the total_amount
    let requestQuery;
    if (requestType === 'medical-reimbursement') {
      requestQuery = `
        SELECT id, employee_id, status, current_approval_level, total_amount
        FROM ${requestTable}
        WHERE id = $1
      `;
    } else {
      requestQuery = `
        SELECT id, employee_id, status, current_approval_level
        FROM ${requestTable}
        WHERE id = $1
      `;
    }

    const requestResult = await query(requestQuery, [id]);

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const requestData = requestResult.rows[0];  // Renamed from request to requestData
    const requestEmployeeId = requestData.employee_id;

    // If request is already approved or rejected, don't allow further actions
    if (requestData.status === 'Approved' || requestData.status === 'Rejected') {
      return NextResponse.json(
        { error: `Request is already ${requestData.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Verify this approver is at the right level for this request
    if (approverLevel !== requestData.current_approval_level) {
      return NextResponse.json(
        { error: "You are not authorized to approve/reject at the current level" },
        { status: 403 }
      );
    }

    // Check if any approvals already exist at this level
    const existingApprovalQuery = `
      SELECT id
      FROM ${approvalTable}
      WHERE ${requestIdColumn} = $1 AND approval_level = $2
    `;

    const existingApprovalResult = await query(existingApprovalQuery, [id, approverLevel]);

    if (existingApprovalResult.rows.length > 0) {
      return NextResponse.json(
        { error: "This request has already been processed at your approval level" },
        { status: 400 }
      );
    }

    // Prepare transaction queries
    let queries = [];
    let newStatus, newApprovalLevel;
    let qrDataURL = null;

    // Determine new status and approval level based on action
    if (action === 'reject') {
      // If rejected, set status to Rejected and leave approval level as is
      newStatus = 'Rejected';
      newApprovalLevel = requestData.current_approval_level;
    } else {
      // MODIFIED: Special handling for house-booking (using only 2 levels)
      if (requestType === 'house-booking') {
        // If approved and this is the last approval level (level 2 for house booking), set to Approved
        if (approverLevel === 2) {
          newStatus = 'Approved';
          newApprovalLevel = approverLevel; // Stay at level 2
        } else {
          // Otherwise, keep as Pending but advance the approval level
          newStatus = 'Pending';
          newApprovalLevel = approverLevel + 1;
        }
      } else if (requestType === 'medical-loa') {
        // Special handling for Medical LOA - only needs HR approval (level 1)
        if (approverLevel === 1) {
          newStatus = 'Approved';
          newApprovalLevel = approverLevel; // Stay at level 1
          
          // Generate QR code when approved
          if (action === 'approve') {
            try {
              // Get LOA details for QR code
              const loaQuery = `
                SELECT ml.*, e.first_name, e.last_name 
                FROM medical_loa ml
                JOIN employees e ON ml.employee_id = e.employee_id
                WHERE ml.id = $1
              `;
              
              const loaResult = await query(loaQuery, [id]);
              
              if (loaResult.rows.length > 0) {
                const loa = loaResult.rows[0];
                const tokenNumber = `ML-${String(loa.id).padStart(6, '0')}`;
                
                // Create data for QR code
                const qrData = JSON.stringify({
                  tokenNumber,
                  hospitalName: loa.hospital_name,
                  patientName: `${loa.first_name} ${loa.last_name}`,
                  visitDate: loa.visit_date,
                  reasonType: loa.reason_type,
                  doctor: loa.preferred_doctor,
                  approvedBy: `${approver.first_name} ${approver.last_name}`,
                  approvedAt: new Date().toISOString()
                });
                
                // Generate QR code
                qrDataURL = await QRCode.toDataURL(qrData, {
                  errorCorrectionLevel: 'H',
                  margin: 1,
                  width: 250
                });
                
                console.log(`QR code generated for Medical LOA ID: ${id}`);
              }
            } catch (qrError) {
              console.error("Error generating QR code:", qrError);
              // Continue with approval even if QR generation fails
            }
          }
        } else {
          // Should never happen, but handle gracefully
          newStatus = 'Pending';
          newApprovalLevel = approverLevel + 1;
        }
      } else {
        // Original logic for other request types
        if (approverLevel === 4) {
          newStatus = 'Approved';
          newApprovalLevel = approverLevel;
        } else {
          newStatus = 'Pending';
          newApprovalLevel = approverLevel + 1;
        }
      }
    }

    // Add approval record insertion to transaction
    const approvalStatus = action === 'approve' ? 'Approved' : 'Rejected';
    
    // Insert the approval record
    const approvalInsertQuery = {
      text: `
        INSERT INTO ${approvalTable} (
          ${requestIdColumn}, 
          approver_employee_id, 
          approval_level, 
          status, 
          comment, 
          approved_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id, approved_at
      `,
      params: [
        id,
        employeeId,
        approverLevel,
        approvalStatus,
        comment
      ]
    };
    
    queries.push(approvalInsertQuery);

    // Update the request status
    const updateRequestQuery = {
      text: `
        UPDATE ${requestTable}
        SET status = $1, current_approval_level = $2, updated_at = CURRENT_TIMESTAMP
        ${qrDataURL ? ', qr_code = $4' : ''}
        WHERE id = $3
        RETURNING id, status, current_approval_level
      `,
      params: qrDataURL 
        ? [newStatus, newApprovalLevel, id, qrDataURL]
        : [newStatus, newApprovalLevel, id]
    };
    
    queries.push(updateRequestQuery);

    // For medical reimbursement, deduct from benefits when fully approved
    let benefitsDeducted = false;
    if (requestType === 'medical-reimbursement' && action === 'approve' && approverLevel === 4) {
      // Get employee's benefits information
      const employeeQuery = `
        SELECT benefits_package, benefits_amount_remaining
        FROM employees
        WHERE employee_id = $1
      `;
      
      const employeeResult = await query(employeeQuery, [requestEmployeeId]);
      
      if (employeeResult.rows.length > 0) {
        const employee = employeeResult.rows[0];
        
        // Check if employee has a benefits package and remaining amount
        if (employee.benefits_package && employee.benefits_amount_remaining !== null) {
          const totalAmount = parseFloat(requestData.total_amount);
          const remainingAmount = parseFloat(employee.benefits_amount_remaining);
          
          // Calculate new remaining amount (ensure it doesn't go below 0)
          const newRemainingAmount = Math.max(0, remainingAmount - totalAmount);
          
          // Update the employee's benefits_amount_remaining
          const updateBenefitsQuery = {
            text: `
              UPDATE employees
              SET benefits_amount_remaining = $1, updated_at = CURRENT_TIMESTAMP
              WHERE employee_id = $2
            `,
            params: [
              newRemainingAmount,
              requestEmployeeId
            ]
          };
          
          queries.push(updateBenefitsQuery);
          benefitsDeducted = true;
          
          console.log(`Medical reimbursement approved: Deducting ${totalAmount} from benefits. New remaining amount: ${newRemainingAmount}`);
        }
      }
    }

    // Execute the transaction
    const results = await transaction(queries);
    
    const approvalRecord = results[0].rows[0];
    const updatedRequest = results[1].rows[0];

    // Handle notifications after transaction succeeds
    try {
      // MODIFIED: Create notification logic for different request types
      if (requestType === 'house-booking') {
        // For house-booking, create notification when approved/rejected by level 2
        if (action === 'reject' || (action === 'approve' && approverLevel === 2)) {
          await createApprovalNotification({
            requestType,
            requestId: parseInt(id),
            employeeId: requestEmployeeId,
            isApproved: action === 'approve',
            approverLevel,
            approverPosition: approver.position_title
          });
        }
      } else if (requestType === 'medical-loa') {
        // For medical-loa, create notification when approved/rejected by HR (level 1)
        if (action === 'reject' || (action === 'approve' && approverLevel === 1)) {
          await createApprovalNotification({
            requestType,
            requestId: parseInt(id),
            employeeId: requestEmployeeId,
            isApproved: action === 'approve',
            approverLevel,
            approverPosition: approver.position_title
          });
        }
      } else {
        // Original logic for other request types
        if (action === 'reject' || (action === 'approve' && approverLevel === 4)) {
          await createApprovalNotification({
            requestType,
            requestId: parseInt(id),
            employeeId: requestEmployeeId,
            isApproved: action === 'approve',
            approverLevel,
            approverPosition: approver.position_title
          });
        }
      }

      // NEW: Create notifications for the next level of approvers if the request was approved
      // and is moving to the next level
      if (action === 'approve' && newStatus === 'Pending' && newApprovalLevel > approverLevel) {
        await createApproverNotification({
          requestType,
          requestId: parseInt(id),
          approvalLevel: newApprovalLevel
        });
      }
    } catch (notificationError: any) {
      console.error("Error creating notifications:", notificationError);
      // Continue even if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      approvalId: approvalRecord.id,
      timestamp: approvalRecord.approved_at,
      requestStatus: updatedRequest.status,
      currentApprovalLevel: updatedRequest.current_approval_level,
      benefitsDeducted: benefitsDeducted,
      notification: action === 'reject' ||
        (action === 'approve' &&
          ((requestType === 'house-booking' && approverLevel === 2) ||
            (requestType === 'medical-loa' && approverLevel === 1) ||
            (requestType !== 'house-booking' && requestType !== 'medical-loa' && approverLevel === 4))) ? 'created' : 'none'
    });
  } catch (error: any) {
    console.error(`Error ${params?.action || 'processing'} request:`, error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}