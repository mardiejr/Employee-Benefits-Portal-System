// app/utils/notification-util.ts

import { query } from "./database";

export async function createApprovalNotification({
  requestType,
  requestId,
  employeeId,
  isApproved,
  approverLevel,
  approverPosition
}: {
  requestType: string;
  requestId: number;
  employeeId: string;
  isApproved: boolean;
  approverLevel: number;
  approverPosition: string;
}) {
  try {
    // Updated to include medical-loa condition
    const isFinalApproval = 
      (requestType === 'house-booking' && approverLevel === 2) || 
      (requestType === 'medical-loa' && approverLevel === 1) ||
      (requestType !== 'house-booking' && requestType !== 'medical-loa' && approverLevel === 4);

    if (!isFinalApproval && isApproved) {
      console.log(`Skipping notification - ${requestType} ID ${requestId} approved by level ${approverLevel} (not final)`);
      return null;
    }
    
    const requestTypeMap: Record<string, string> = {
      'medical-reimbursement': 'Medical Reimbursement',
      'housing-loan': 'Housing Loan',
      'car-loan': 'Car Loan',
      'salary-loan': 'Salary Loan',
      'house-booking': 'Staff House Booking',
      'medical-loa': 'Medical LOA'
    };
    
    const friendlyType = requestTypeMap[requestType] || requestType;
    
    const tokenPrefixMap: Record<string, string> = {
      'medical-reimbursement': 'MR',
      'housing-loan': 'HL',
      'car-loan': 'CL',
      'salary-loan': 'SL', 
      'house-booking': 'HB',
      'medical-loa': 'ML'
    };
    
    const tokenPrefix = tokenPrefixMap[requestType] || 'REQ';
    const tokenNumber = `${tokenPrefix}-${String(requestId).padStart(6, '0')}`;
    
    const title = isApproved 
      ? `${friendlyType} Request Approved`
      : `${friendlyType} Request Rejected`;
    
    let message = '';
    if (isApproved) {
      // Calculate the claim period (7 days from approval date)
      const approvalDate = new Date();
      const endClaimDate = new Date(approvalDate);
      endClaimDate.setDate(endClaimDate.getDate() + 7);
      
      // Format the dates
      const formattedApprovalDate = approvalDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const formattedEndDate = endClaimDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (['housing-loan', 'car-loan', 'salary-loan', 'medical-reimbursement'].includes(requestType)) {
        message = `Your ${friendlyType.toLowerCase()} request (${tokenNumber}) has been approved. You can now come to our HR office and claim the money within a week (${formattedApprovalDate} to ${formattedEndDate}).`;
      } else if (requestType === 'medical-loa') {
        message = `Your ${friendlyType} request (${tokenNumber}) has been approved. Please download the QR code and bring it to the admission desk at our partner hospitals at your date of consultation.`;
      } else {
        message = `Your ${friendlyType.toLowerCase()} request (${tokenNumber}) has been approved.`;
      }
    } else {
      message = `Your ${friendlyType.toLowerCase()} request (${tokenNumber}) has been rejected by ${approverPosition}. Please check the comments for details.`;
    }
    
    // Insert notification for the employee
    const result = await query(`
      INSERT INTO notifications (
        employee_id,
        type,
        title,
        message,
        reference_id,
        reference_type,
        is_read,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
      RETURNING id
    `, [
      employeeId,
      isApproved ? 'request-approved' : 'request-rejected',
      title,
      message,
      requestId,
      requestType
    ]);
    
    console.log(`Created notification for ${requestType} ID ${requestId} - ${isApproved ? 'approved' : 'rejected'}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Creates a notification for approvers when a request is ready for their approval
 */
export async function createApproverNotification({
  requestType,
  requestId,
  approvalLevel
}: {
  requestType: string;
  requestId: number;
  approvalLevel: number;
}) {
  try {
    // Get approvers who are eligible to approve this request level
    const getApproversQuery = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        a.approval_level as position_title,
        a.numeric_level
      FROM approvers a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.numeric_level = $1 AND a.can_approve = true
    `;
    
    const approversResult = await query(getApproversQuery, [approvalLevel]);
    
    if (approversResult.rows.length === 0) {
      console.log(`No approvers found for ${requestType} ID ${requestId} at level ${approvalLevel}`);
      return null;
    }
    
    console.log(`Found ${approversResult.rows.length} approvers for ${requestType} ID ${requestId} at level ${approvalLevel}`);
    
    const requestTypeMap: Record<string, string> = {
      'medical-reimbursement': 'Medical Reimbursement',
      'housing-loan': 'Housing Loan',
      'car-loan': 'Car Loan',
      'salary-loan': 'Salary Loan',
      'house-booking': 'Staff House Booking',
      'medical-loa': 'Medical LOA'
    };
    
    const friendlyType = requestTypeMap[requestType] || requestType;
    
    const tokenPrefixMap: Record<string, string> = {
      'medical-reimbursement': 'MR',
      'housing-loan': 'HL',
      'car-loan': 'CL',
      'salary-loan': 'SL', 
      'house-booking': 'HB',
      'medical-loa': 'ML'
    };
    
    const tokenPrefix = tokenPrefixMap[requestType] || 'REQ';
    const tokenNumber = `${tokenPrefix}-${String(requestId).padStart(6, '0')}`;
    
    const title = `New ${friendlyType} Request Requires Your Approval`;
    const message = `A ${friendlyType.toLowerCase()} request (${tokenNumber}) requires your approval.`;
    
    // Create notifications for all eligible approvers
    const insertPromises = approversResult.rows.map(approver => {
      return query(`
        INSERT INTO notifications (
          employee_id,
          type,
          title,
          message,
          reference_id,
          reference_type,
          is_read,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
        RETURNING id
      `, [
        approver.employee_id,
        'approval-required',
        title,
        message,
        requestId,
        requestType
      ]);
    });
    
    const results = await Promise.all(insertPromises);
    console.log(`Created ${results.length} approver notifications for ${requestType} ID ${requestId} at level ${approvalLevel}`);
    return results.map(r => r.rows[0].id);
  } catch (error) {
    console.error('Error creating approver notifications:', error);
    return null;
  }
}