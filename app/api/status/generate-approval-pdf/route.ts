// app/api/status/generate-approval-pdf/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from "../../../utils/database";

export async function GET(req: Request) {
  try {
    // Get the employee ID from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Get ticket ID from URL
    const url = new URL(req.url);
    const ticketId = url.searchParams.get('ticketId');
    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Determine ticket type from ID (e.g., "salary-loan-123")
    const ticketParts = ticketId.split('-');
    const ticketType = ticketParts[0];

    let ticket;
    let approvers = [];
    let tokenNumber = '';

    // Fetch ticket data based on type
    if (ticketType === 'salary' || ticketType === 'car' || ticketType === 'housing') {
      // This is a loan
      const loanType = `${ticketType}_loan`;
      const loanId = ticketParts[ticketParts.length - 1];

      // Query to get loan data
      const loanQuery = `
        SELECT 
          l.*, 
          e.first_name, 
          e.last_name, 
          e.employee_id,
          e.position,
          e.department,
          e.phone_number,
          l.comaker_file_path
        FROM ${loanType} l
        JOIN employees e ON l.employee_id = e.employee_id
        WHERE l.id = $1 AND l.employee_id = $2 AND l.status = 'Approved'
      `;

      const loanResult = await query(loanQuery, [loanId, employeeId]);
      if (loanResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Approved loan not found or you do not have permission to view it' },
          { status: 404 }
        );
      }

      ticket = loanResult.rows[0];

      // Get token number from loan record if available
      if (ticket.token_number) {
        tokenNumber = ticket.token_number;
      } else {
        // Generate token number based on loan type
        const prefix = ticketType === 'car' ? 'CL' :
          ticketType === 'salary' ? 'SL' :
            'HL'; // housing loan
        tokenNumber = `${prefix}-${String(ticket.id).padStart(6, '0')}`;
      }

      // Get approvers for this loan
      const approversQuery = `
        SELECT 
          a.*,
          e.first_name,
          e.middle_name,
          e.last_name,
          e.position
        FROM ${loanType}_approval a
        JOIN employees e ON a.approver_employee_id = e.employee_id
        WHERE a.${loanType}_id = $1
        ORDER BY a.approval_level
      `;

      const approversResult = await query(approversQuery, [loanId]);
      approvers = approversResult.rows;

    } else if (ticketType === 'medical' && ticketParts[1] === 'reimbursement') {
      // This is a medical reimbursement
      const reimbursementId = ticketParts[ticketParts.length - 1];

      // Query to get reimbursement data
      const reimbursementQuery = `
        SELECT 
          m.*, 
          e.first_name, 
          e.last_name, 
          e.employee_id,
          e.position,
          e.department,
          e.phone_number
        FROM medical_reimbursement m
        JOIN employees e ON m.employee_id = e.employee_id
        WHERE m.id = $1 AND m.employee_id = $2 AND m.status = 'Approved'
      `;

      const reimbursementResult = await query(reimbursementQuery, [reimbursementId, employeeId]);
      if (reimbursementResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Approved reimbursement not found or you do not have permission to view it' },
          { status: 404 }
        );
      }

      ticket = reimbursementResult.rows[0];

      // Get token number from reimbursement record if available
      if (ticket.token_number) {
        tokenNumber = ticket.token_number;
      } else {
        // Generate token number for medical reimbursement
        tokenNumber = `MR-${String(ticket.id).padStart(6, '0')}`;
      }

      // Get approvers for this reimbursement
      const approversQuery = `
        SELECT 
          a.*,
          e.first_name,
          e.middle_name,
          e.last_name,
          e.position
        FROM medical_reimbursement_approval a
        JOIN employees e ON a.approver_employee_id = e.employee_id
        WHERE a.medical_reimbursement_id = $1
        ORDER BY a.approval_level
      `;

      const approversResult = await query(approversQuery, [reimbursementId]);
      approvers = approversResult.rows;

    } else {
      return NextResponse.json(
        { error: 'Invalid ticket type' },
        { status: 400 }
      );
    }

    // Get attachments data
    let attachmentsText = [];

    if (ticketType === 'salary') {
      if (ticket.comaker_file_path) attachmentsText.push('Co-maker Document');
    } else if (ticketType === 'car') {
      if (ticket.comaker_file_path) attachmentsText.push('Co-maker Document');
      if (ticket.car_quotation_file_path) attachmentsText.push('Car Quotation');
    } else if (ticketType === 'housing') {
      if (ticket.comaker_file_path) attachmentsText.push('Co-maker Document');
      if (ticket.property_documents_file_path) attachmentsText.push('Property Documents');
    } else if (ticketType === 'medical') {
      if (ticket.receipt_file_path) attachmentsText.push('Medical Receipt');
      if (ticket.certificate_file_path) attachmentsText.push('Medical Certificate');
    }

    // Format for currency display
    const formatCurrency = (amount: number | string | null | undefined) => {
      if (amount === null || amount === undefined) {
        return "₱0.00"; // Note: using the actual peso sign
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount)) {
        return "₱0.00";
      }

      return `₱${numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    };

    // Format date
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Benefit type title
    const benefitType = ticketType === 'salary' ? 'SALARY LOAN DETAILS' :
      ticketType === 'housing' ? 'HOUSING LOAN DETAILS' :
        ticketType === 'car' ? 'CAR LOAN DETAILS' :
          'MEDICAL REIMBURSEMENT DETAILS';

    // Create benefit details HTML based on type
    let benefitDetailsHTML = '';

    if (ticketType === 'salary' || ticketType === 'housing' || ticketType === 'car') {
      // Loan details
      let loanAmount;
      if (ticketType === 'car') {
        loanAmount = ticket.loan_amount_requested;
      } else if (ticketType === 'housing') {
        loanAmount = ticket.loan_amount_requested || ticket.property_value;
      } else {
        loanAmount = ticket.loan_amount;
      }

      const repaymentTermMonths = parseInt(ticket.repayment_term.split(' ')[0]);
      const monthlyDeduction = loanAmount / repaymentTermMonths;

      benefitDetailsHTML = `
        <tr><td><strong>Benefit Type:</strong></td><td>${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Loan</td></tr>
        <tr><td><strong>Request Date:</strong></td><td>${formatDate(ticket.submitted_at)}</td></tr>
        <tr><td><strong>Approval Date:</strong></td><td>${formatDate(ticket.updated_at)}</td></tr>
        <tr><td><strong>Status:</strong></td><td><span class="status-approved">APPROVED</span></td></tr>
        <tr><td><strong>Loan Amount:</strong></td><td>${formatCurrency(loanAmount)}</td></tr>
        <tr><td><strong>Repayment Term:</strong></td><td>${ticket.repayment_term}</td></tr>
        <tr><td><strong>Monthly Deduction:</strong></td><td>${formatCurrency(monthlyDeduction)}</td></tr>
      `;

      if (ticketType === 'car') {
        benefitDetailsHTML += `
          <tr><td><strong>Car Make:</strong></td><td>${ticket.car_make}</td></tr>
          <tr><td><strong>Car Model:</strong></td><td>${ticket.car_model}</td></tr>
          <tr><td><strong>Car Year:</strong></td><td>${ticket.car_year}</td></tr>
        `;
      } else if (ticketType === 'housing') {
        benefitDetailsHTML += `
          <tr><td><strong>Property Type:</strong></td><td>${ticket.property_type}</td></tr>
          <tr><td><strong>Property Address:</strong></td><td>${ticket.property_address}</td></tr>
          <tr><td><strong>Property Value:</strong></td><td>${formatCurrency(ticket.property_value)}</td></tr>
        `;
      } else {
        // Salary loan specific
        benefitDetailsHTML += `
          <tr><td><strong>Loan Purpose:</strong></td><td>${ticket.loan_purpose || 'Not specified'}</td></tr>
          <tr><td><strong>Co-maker Document:</strong></td><td>Verified and Approved</td></tr>
        `;
      }

    } else if (ticketType === 'medical') {
      // Medical reimbursement details
      benefitDetailsHTML = `
        <tr><td><strong>Benefit Type:</strong></td><td>Medical Reimbursement</td></tr>
        <tr><td><strong>Request Date:</strong></td><td>${formatDate(ticket.submitted_at)}</td></tr>
        <tr><td><strong>Approval Date:</strong></td><td>${formatDate(ticket.updated_at)}</td></tr>
        <tr><td><strong>Status:</strong></td><td><span class="status-approved">APPROVED</span></td></tr>
        <tr><td><strong>Amount Requested:</strong></td><td>${formatCurrency(ticket.total_amount)}</td></tr>
        <tr><td><strong>Amount Approved:</strong></td><td>${formatCurrency(ticket.approved_amount || ticket.total_amount)}</td></tr>
        <tr><td><strong>Patient Type:</strong></td><td>${ticket.patient_type ? (ticket.patient_type === 'inpatient' ? 'In-patient' : 'Out-patient') : 'Not specified'}</td></tr>
        <tr><td><strong>Date of Admission:</strong></td><td>${formatDate(ticket.admission_date)}</td></tr>
        <tr><td><strong>Date of Discharge:</strong></td><td>${ticket.discharge_date ? formatDate(ticket.discharge_date) : 'None'}</td></tr>
      `;
    }

    // Create HTML for attachments list
    const attachmentsHTML = attachmentsText.map(attachment => `<li>${attachment}</li>`).join('');

    // Create HTML for approvers list
    const approversHTML = approvers.map(approver => {
      const fullName = `${approver.first_name} ${approver.middle_name ? approver.middle_name.charAt(0) + '. ' : ''}${approver.last_name}`;
      return `
        <tr>
          <td>${fullName}</td>
          <td>${approver.position}</td>
          <td><span class="status-approved">APPROVED</span></td>
          <td>${formatDate(approver.approved_at || approver.updated_at)}</td>
        </tr>
      `;
    }).join('');

    // Terms and conditions
    let termsHTML = '';

    if (ticketType === 'salary' || ticketType === 'car' || ticketType === 'housing') {
      // Loan terms
      termsHTML = `
        <li>The loan will be deducted from your monthly salary at the rate specified in this agreement.</li>
        <li>Early repayment is allowed without additional fees.</li>
        <li>The first deduction will commence every month after the loan is aprroved.</li>
        <li>The approved loan amount must be claimed at the HR office within seven (7) business days following final approval.</li>
        <li>This benefit cannot be transferred to another employee.</li>
      `;
    } else {
      // Medical reimbursement terms
      termsHTML = `
        <li>The approved amount will be deducted from your package.</li>
        <li>The approved loan amount must be claimed at the HR office within seven (7) business days following final approval.</li>
        <li>The company reserves the right to verify the authenticity of submitted documents.</li>
        <li>Fraudulent claims may result in disciplinary action, up to and including termination.</li>
        <li>This benefit is subject to annual limits as defined in the Medical Benefits Policy.</li>
      `;
    }

    // Create the HTML for the certificate with client-side PDF generation
    const finalHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Benefit Approval Form</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
          font-size: 11pt;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        img.company-logo {
          height: 50px;
          margin-right: 15px;
        }
        .company-name {
          font-size: 24pt;
          font-weight: bold;
        }
        .title {
          font-size: 18pt;
          font-weight: bold;
          margin: 15px 0;
          text-align: center;
          text-transform: uppercase;
          color: #333;
        }
        .cert-details {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          color: #000080;
          margin-top: 20px;
          margin-bottom: 10px;
          border-bottom: 1px solid #000080;
          padding-bottom: 5px;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        table.data-table td {
          padding: 5px;
          vertical-align: top;
        }
        table.data-table td:first-child {
          width: 180px;
        }
        .approvers-table {
          width: 100%;
          border-collapse: collapse;
        }
        .approvers-table th {
          background-color: #f0f0f0;
          text-align: center;
          padding: 5px;
        }
        .approvers-table td, .approvers-table th {
          border: 1px solid #cccccc;
          padding: 8px;
        }
        .status-approved {
          color: green;
          font-weight: bold;
        }
        ul {
          margin-top: 5px;
        }
        li {
          margin-bottom: 5px;
        }
        
        /* Controls and feedback styling */
        .controls {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #f8f9fa;
          padding: 15px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        
        .controls button {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .controls button:hover {
          background: #0069d9;
        }
        
        .content-wrapper {
          margin-top: 70px;
        }

        .page-break {
          page-break-before: always;
        }
        
        @media print {
          .controls {
            display: none;
          }
          .content-wrapper {
            margin-top: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="controls">
        <button id="downloadBtn">Download PDF</button>
        <span id="status"></span>
      </div>
      
      <div class="content-wrapper">
        <div class="container" id="pdf-content">
          <div class="header">
            <img src="data:image/png;base64,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" alt="InLife Employees' Portal Logo" class="company-logo" style="height: 80px;">
            <div class="company-name">Insular Life</div>
          </div>
          
          <div class="title">BENEFIT APPROVAL FORM</div>
          
          <div class="cert-details">
            <p><strong>Form Number:</strong> ${tokenNumber}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="section-title">EMPLOYEE INFORMATION</div>
        <!-- With this -->
          <table class="data-table">
          <tr>
           <td><strong>Employee ID:</strong></td>
           <td>${ticket.employee_id}</td>
          </tr>
          <tr>
           <td><strong>Employee Name:</strong></td>
           <td>${ticket.first_name} ${ticket.last_name}</td>
          </tr>
            <tr>
              <td><strong>Department:</strong></td>
              <td>${ticket.department}</td>
            </tr>
            <tr>
              <td><strong>Position:</strong></td>
              <td>${ticket.position}</td>
            </tr>
            <tr>
              <td><strong>Contact Number:</strong></td>
              <td>${ticket.phone_number || 'Not provided'}</td>
            </tr>
          </table>
          
          <div class="section-title">${benefitType}</div>
          <table class="data-table">
            ${benefitDetailsHTML}
          </table>
          
          <div class="section-title">DOCUMENTATION</div>
          <p>The following documents were submitted and verified:</p>
          <ul>
            ${attachmentsHTML}
          </ul>
          
          <div class="page-break"></div>
          <div class="section-title">APPROVERS</div>
          <table class="approvers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${approversHTML}
            </tbody>
          </table>
          
          <div class="section-title">TERMS AND CONDITIONS</div>
          <ol>
            ${termsHTML}
          </ol>
           <div class="section-title">SIGNATURES</div>
<div style="margin-top: 30px; display: flex; justify-content: space-between; padding: 0 40px;">
  <div style="text-align: center; width: 40%;">
    <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
    <p style="margin: 5px 0;"><strong>${ticket.first_name} ${ticket.last_name}</strong></p>
    <p style="margin: 5px 0;">Employee</p>
    <p style="margin: 5px 0;">Date: ${formatDate(ticket.updated_at)}</p>
  </div>

  <div style="text-align: center; width: 40%;">
    <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
    <p style="margin: 5px 0;"><strong>Mardie E. Dela Cruz</strong></p>
    <p style="margin: 5px 0;">HR Manager</p>
    <p style="margin: 5px 0;">Date: ${formatDate(ticket.updated_at)}</p>
  </div> 
</div>
        </div>
      </div>
      
      <script>
        // When the page loads, initialize the PDF generator
        document.addEventListener('DOMContentLoaded', function() {
          const statusElement = document.getElementById('status');
          const downloadBtn = document.getElementById('downloadBtn');
          const pdfContent = document.getElementById('pdf-content');
          
          // Set up download button
          downloadBtn.addEventListener('click', function() {
            statusElement.textContent = 'Generating PDF...';
            
            const opt = {
              margin: [10, 10, 10, 10],
              filename: 'approval-certificate-${tokenNumber}.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                logging: false
              },
              jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait' 
              }
            };
            
            // Generate PDF
            html2pdf().from(pdfContent).set(opt).save().then(() => {
              statusElement.textContent = 'PDF downloaded successfully!';
            }).catch(err => {
              statusElement.textContent = 'Error generating PDF: ' + err.message;
              console.error('PDF generation error:', err);
            });
          });
          
          // Auto-download after 2 seconds
          setTimeout(function() {
            downloadBtn.click();
          }, 2000);
        });
      </script>
    </body>
    </html>
    `;

    // Return the HTML with appropriate headers
    return new Response(finalHtml, {
      headers: {
        'Content-Type': 'text/html',
      }
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}