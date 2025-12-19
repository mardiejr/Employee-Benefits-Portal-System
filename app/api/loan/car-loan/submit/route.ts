// app/api/loans/car-loan/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApproverNotification } from "../../../../utils/notification-util";
import { uploadFile } from "../../../../utils/file-upload";
import { query } from "../../../../utils/database";

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    // Get form data
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const position = formData.get('position') as string;
    const contactNumber = formData.get('contactNumber') as string;
    const carMake = formData.get('carMake') as string;
    const carModel = formData.get('carModel') as string;
    const carYear = formData.get('carYear') as string;
    const vehiclePrice = parseFloat(formData.get('vehiclePrice') as string);
    const loanAmountRequested = parseFloat(formData.get('loanAmountRequested') as string);
    const repaymentTerm = formData.get('repaymentTerm') as string;
    const dealerName = formData.get('dealerName') as string;
    const monthlySalary = parseFloat(formData.get('monthlySalary') as string);

    const comakerDocument = formData.get('comakerDocument') as File;
    const carQuotationFile = formData.get('carQuotationFile') as File;

    // Validation
    if (!firstName || !lastName || !position || !contactNumber || !carMake ||
      !carModel || !carYear || !vehiclePrice || !loanAmountRequested ||
      !repaymentTerm || !dealerName || !monthlySalary ||
      !comakerDocument || !carQuotationFile) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z\s]+$/.test(dealerName)) {
      return NextResponse.json(
        { error: "Dealer name must contain only letters" },
        { status: 400 }
      );
    }

    // Upload files to storage
    const timestamp = Date.now();

    // Upload co-maker document
    const comakerBytes = await comakerDocument.arrayBuffer();
    const comakerBuffer = Buffer.from(comakerBytes);
    const comakerFileName = `car-loans/${employeeId}/comaker_${timestamp}_${comakerDocument.name}`;
    const comakerResult = await uploadFile(comakerBuffer, comakerFileName);

    // Upload car quotation
    const carQuotationBytes = await carQuotationFile.arrayBuffer();
    const carQuotationBuffer = Buffer.from(carQuotationBytes);
    const carQuotationFileName = `car-loans/${employeeId}/car_quotation_${timestamp}_${carQuotationFile.name}`;
    const carQuotationResult = await uploadFile(carQuotationBuffer, carQuotationFileName);

    // Insert into database
    const insertQuery = `
      INSERT INTO car_loan (
        employee_id,
        first_name,
        last_name,
        position,
        contact_number,
        car_make,
        car_model,
        car_year,
        vehicle_price,
        loan_amount_requested,
        repayment_term,
        dealer_name,
        monthly_salary,
        comaker_file_path,
        car_quotation_file_path,
        status,
        current_approval_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Pending', 1)
      RETURNING id, submitted_at
    `;

    const values = [
      employeeId,
      firstName,
      lastName,
      position,
      contactNumber,
      carMake,
      carModel,
      carYear,
      vehiclePrice,
      loanAmountRequested,
      repaymentTerm,
      dealerName,
      monthlySalary,
      comakerResult.url,
      carQuotationResult.url
    ];

    const result = await query(insertQuery, values);
    const loanId = result.rows[0].id;

    // Create notification for approvers
    await createApproverNotification({
      requestType: 'car-loan',
      requestId: loanId,
      approvalLevel: 1
    });

    return NextResponse.json({
      success: true,
      message: "Car loan application submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error submitting car loan:", error);
    return NextResponse.json(
      { error: "Failed to submit car loan application" },
      { status: 500 }
    );
  }
}