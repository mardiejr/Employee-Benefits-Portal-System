import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApproverNotification } from "../../../../utils/notification-util";
import { uploadFile } from "../../../../utils/file-upload";
import { query } from "../../../../utils/database";

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
    const position = formData.get('position') as string;
    const contactNumber = formData.get('contactNumber') as string;
    const email = formData.get('email') as string;
    const monthlySalary = parseFloat(formData.get('monthlySalary') as string);
    const lengthOfService = formData.get('lengthOfService') as string;

    const propertyType = formData.get('propertyType') as string;
    const propertyAddress = formData.get('propertyAddress') as string;
    const propertyValue = parseFloat(formData.get('propertyValue') as string);
    const sellerName = formData.get('sellerName') as string;
    const sellerContact = formData.get('sellerContact') as string;
    const loanAmountRequested = parseFloat(formData.get('loanAmountRequested') as string);
    const repaymentTerm = formData.get('repaymentTerm') as string;

    const comakerDocument = formData.get('comakerDocument') as File;
    const propertyDocumentsFile = formData.get('propertyDocumentsFile') as File;

    // Validate required fields
    if (!firstName || !lastName || !position || !contactNumber || !email ||
      !monthlySalary || !lengthOfService || !propertyType || !propertyAddress ||
      !propertyValue || !sellerName || !sellerContact || !loanAmountRequested ||
      !repaymentTerm || !comakerDocument || !propertyDocumentsFile) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate seller contact number format
    if (!/^09\d{9}$/.test(sellerContact)) {
      return NextResponse.json(
        { error: "Invalid seller contact number format. Must start with 09 and be exactly 11 digits" },
        { status: 400 }
      );
    }

    // Validate seller name (only letters and spaces)
    if (!/^[a-zA-Z\s]+$/.test(sellerName)) {
      return NextResponse.json(
        { error: "Seller name must contain only letters" },
        { status: 400 }
      );
    }

    // Validate loan amount (maximum 30x monthly salary)
    const maxLoanAmount = monthlySalary * 30;
    if (loanAmountRequested > maxLoanAmount) {
      return NextResponse.json(
        { error: `Loan amount cannot exceed ₱${maxLoanAmount.toLocaleString()} (30x your monthly salary)` },
        { status: 400 }
      );
    }

    // Upload files to storage
    const timestamp = Date.now();
    
    // Upload co-maker document
    const comakerBytes = await comakerDocument.arrayBuffer();
    const comakerBuffer = Buffer.from(comakerBytes);
    const comakerFileName = `housing-loans/${employeeId}/comaker_${timestamp}_${comakerDocument.name}`;
    const comakerResult = await uploadFile(comakerBuffer, comakerFileName);

    // Upload property documents
    const propertyDocumentsBytes = await propertyDocumentsFile.arrayBuffer();
    const propertyDocumentsBuffer = Buffer.from(propertyDocumentsBytes);
    const propertyDocumentsFileName = `housing-loans/${employeeId}/property_docs_${timestamp}_${propertyDocumentsFile.name}`;
    const propertyDocumentsResult = await uploadFile(propertyDocumentsBuffer, propertyDocumentsFileName);

    // Insert into database
    const insertQuery = `
      INSERT INTO housing_loan (
        employee_id,
        first_name,
        last_name,
        position,
        contact_number,
        email,
        monthly_salary,
        length_of_service,
        property_type,
        property_address,
        property_value,
        seller_name,
        seller_contact,
        loan_amount_requested,
        repayment_term,
        comaker_file_path,
        property_documents_file_path,
        status,
        current_approval_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Pending', 1)
      RETURNING id, submitted_at
    `;

    const values = [
      employeeId,
      firstName,
      lastName,
      position,
      contactNumber,
      email,
      monthlySalary,
      lengthOfService,
      propertyType,
      propertyAddress,
      propertyValue,
      sellerName,
      sellerContact,
      loanAmountRequested,
      repaymentTerm,
      comakerResult.url,
      propertyDocumentsResult.url
    ];

    const result = await query(insertQuery, values);
    const loanId = result.rows[0].id;

    await createApproverNotification({
      requestType: 'housing-loan',
      requestId: loanId,
      approvalLevel: 1
    });

    return NextResponse.json({
      success: true,
      message: "Housing loan application submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error submitting housing loan:", error);
    return NextResponse.json(
      { error: "Failed to submit housing loan application" },
      { status: 500 }
    );
  }
}