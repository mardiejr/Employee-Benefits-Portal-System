// app/api/loan/salary-loan/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApproverNotification } from "../../../../utils/notification-util";
import { uploadFile } from "../../../../utils/file-upload";
import { query } from "../../../../utils/database";

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

    const formData = await req.formData();
    
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const position = formData.get('position') as string;
    const contactNumber = formData.get('contactNumber') as string;
    const loanAmount = parseFloat(formData.get('loanAmount') as string);
    const loanPurpose = formData.get('loanPurpose') as string;
    const repaymentTerm = formData.get('repaymentTerm') as string;
    const monthlySalary = parseFloat(formData.get('monthlySalary') as string);
    
    const comakerFile = formData.get('comakerFile') as File;

    if (!firstName || !lastName || !position || !contactNumber || !loanAmount || 
        !loanPurpose || !repaymentTerm || !monthlySalary || !comakerFile) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Upload file to Vercel Blob
    const timestamp = Date.now();
    
    // Upload co-maker document
    const comakerBytes = await comakerFile.arrayBuffer();
    const comakerBuffer = Buffer.from(comakerBytes);
    const comakerFileName = `salary-loans/${employeeId}/comaker_${timestamp}_${comakerFile.name}`;
    const comakerResult = await uploadFile(comakerBuffer, comakerFileName);

    // Insert into database with new schema (only comaker_file_path)
    const insertQuery = `
      INSERT INTO salary_loan (
        employee_id,
        first_name,
        last_name,
        position,
        contact_number,
        loan_amount,
        loan_purpose,
        repayment_term,
        monthly_salary,
        comaker_file_path,
        status,
        current_approval_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', 1)
      RETURNING id, submitted_at
    `;

    const values = [
      employeeId,
      firstName,
      lastName,
      position,
      contactNumber,
      loanAmount,
      loanPurpose,
      repaymentTerm,
      monthlySalary,
      comakerResult.url
    ];

    const result = await query(insertQuery, values);
    const loanId = result.rows[0].id;
    
    // Create notifications for approvers at level 1
    await createApproverNotification({
      requestType: 'salary-loan',
      requestId: loanId,
      approvalLevel: 1
    });

    return NextResponse.json({
      success: true,
      message: "Salary loan application submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error submitting salary loan:", error);
    return NextResponse.json(
      { error: "Failed to submit salary loan application: " + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}