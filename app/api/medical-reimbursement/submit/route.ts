import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApproverNotification } from "../../../utils/notification-util";
import { uploadFile } from "../../../utils/file-upload";
import { query } from "../../../utils/database";

export async function POST(req: NextRequest) {
  try {
    // Get the logged-in user's employee_id from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const patientType = formData.get('patientType') as string;
    const admissionDate = formData.get('admissionDate') as string;
    const dischargeDate = formData.get('dischargeDate') as string | null;
    const totalAmount = parseFloat(formData.get('totalAmount') as string);
    const claimMethod = formData.get('claimMethod') as string;

    const medicalReceiptFile = formData.get('medicalReceipt') as File;
    const medicalCertFile = formData.get('medicalCert') as File;

    // Validate required fields
    if (!firstName || !lastName || !patientType || !admissionDate || !totalAmount || !claimMethod || !medicalReceiptFile || !medicalCertFile) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    // Additional validation for inpatient type
    if (patientType === 'inpatient' && !dischargeDate) {
      return NextResponse.json(
        { error: "Discharge date is required for in-patient claims" },
        { status: 400 }
      );
    }

    // Validate claim method
    if (!['cash', 'salary'].includes(claimMethod)) {
      return NextResponse.json(
        { error: "Invalid claim method selected" },
        { status: 400 }
      );
    }

    // Validate dates
    try {
      const admissionDateTime = new Date(admissionDate);
      const currentDateTime = new Date();
      
      if (admissionDateTime > currentDateTime) {
        return NextResponse.json(
          { error: "Admission date must be before current date" },
          { status: 400 }
        );
      }

      if (dischargeDate) {
        const dischargeDateTime = new Date(dischargeDate);
        
        if (dischargeDateTime < admissionDateTime) {
          return NextResponse.json(
            { error: "Discharge date must be after admission date" },
            { status: 400 }
          );
        }
        
        if (dischargeDateTime > currentDateTime) {
          return NextResponse.json(
            { error: "Discharge date must be before current date" },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Check benefits package eligibility
    const employeeQuery = `
      SELECT benefits_package, benefits_amount_remaining
      FROM employees
      WHERE employee_id = $1
    `;
    
    const employeeResult = await query(employeeQuery, [employeeId]);
    
    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    
    const employee = employeeResult.rows[0];
    
    // Check if employee has a benefits package
    if (!employee.benefits_package) {
      return NextResponse.json(
        { error: "You don't have an active benefits package. Please contact HR." },
        { status: 400 }
      );
    }
    
    // Check if the requested amount exceeds the remaining benefits
    if (totalAmount > employee.benefits_amount_remaining) {
      return NextResponse.json({
        error: `The requested amount (₱${totalAmount.toLocaleString('en-PH')}) exceeds your remaining benefits balance (₱${parseFloat(employee.benefits_amount_remaining).toLocaleString('en-PH')})`
      }, { status: 400 });
    }

    // Upload files to Vercel Blob
    const timestamp = Date.now();
    
    // Upload medical receipt
    const receiptBytes = await medicalReceiptFile.arrayBuffer();
    const receiptBuffer = Buffer.from(receiptBytes);
    const receiptFileName = `medical-reimbursements/${employeeId}/receipt_${timestamp}_${medicalReceiptFile.name}`;
    const receiptResult = await uploadFile(receiptBuffer, receiptFileName);

    // Upload medical certificate
    const certBytes = await medicalCertFile.arrayBuffer();
    const certBuffer = Buffer.from(certBytes);
    const certFileName = `medical-reimbursements/${employeeId}/cert_${timestamp}_${medicalCertFile.name}`;
    const certResult = await uploadFile(certBuffer, certFileName);

    // Insert into database
    const insertQuery = `
      INSERT INTO medical_reimbursement (
        employee_id,
        first_name,
        last_name,
        patient_type,
        admission_date,
        discharge_date,
        total_amount,
        claim_method,
        receipt_file_path,
        certificate_file_path,
        status,
        current_approval_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', 1)
      RETURNING id, submitted_at
    `;

    const values = [
      employeeId,
      firstName,
      lastName,
      patientType,
      admissionDate,
      dischargeDate || null,
      totalAmount,
      claimMethod,
      receiptResult.url,
      certResult.url
    ];

    const result = await query(insertQuery, values);
    const reimbursementId = result.rows[0].id;

    await createApproverNotification({
      requestType: 'medical-reimbursement',
      requestId: reimbursementId,
      approvalLevel: 1
    });
    
    return NextResponse.json({
      success: true,
      message: "Medical reimbursement request submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error submitting medical reimbursement:", error);
    return NextResponse.json(
      { error: "Failed to submit medical reimbursement request" },
      { status: 500 }
    );
  }
}