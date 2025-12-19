// app/api/medical-loa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createApproverNotification } from "../../utils/notification-util";
import { query } from "../../utils/database";

// Helper function to create activity log entry
async function createActivityLog(params: {
  userId: string;
  action: string;
  module: string;
  details: string;
  status: string;
  ipAddress?: string;
}) {
  try {
    // Insert into activity_logs table
    await query(`
      INSERT INTO activity_logs (
        user_id,
        action,
        module,
        details,
        ip_address,
        status,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW()
      )
    `, [
      params.userId,
      params.action,
      params.module,
      params.details,
      params.ipAddress || '127.0.0.1',
      params.status
    ]);
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get the logged-in user's employee_id from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    console.log('Employee ID from cookie:', employeeId);

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Parse JSON data
    const requestData = await req.json();
    console.log('Received Medical LOA request:', requestData);

    let {
      hospitalId,
      hospitalName,
      hospitalAddress,
      hospitalCity,
      hospitalProvince,
      hospitalRegion,
      visitDate,
      reasonType,
      patientComplaint,
      preferredDoctor,
    } = requestData;

    // Map the reason type to the format expected by the database constraint
    const reasonTypeMap: Record<string, string> = {
      'consultation': 'consultation',       // Keep as is since it works
      'laboratory': 'Laboratory Exam', // Change to match constraint
      'diagnostics': 'diagnostics',         // Keep as is since it works
      'confinement': 'confinement',         // Keep as is since it works
      'other': 'Other Procedures' // Change to match constraint
    };

    // Apply the mapping if the reason type is one of our known values
    if (reasonType.toLowerCase() in reasonTypeMap) {
      reasonType = reasonTypeMap[reasonType.toLowerCase()];
    }

    console.log('Mapped reasonType:', reasonType);

    // Input validation
    if (!hospitalId || !hospitalName || !visitDate || !reasonType || !patientComplaint) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get employee details from database
    const employeeQuery = `
      SELECT 
        employee_id, 
        first_name, 
        last_name,
        position,
        department
      FROM employees 
      WHERE employee_id = $1 AND is_active = true
    `;

    const employeeResult = await query(employeeQuery, [employeeId]);
    console.log('Employee query result:', employeeResult.rows);

    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found or inactive" },
        { status: 404 }
      );
    }

    const employee = employeeResult.rows[0];

    // Insert into medical_loa table with current_approval_level set to 1 (HR only approval)
    const insertQuery = `
      INSERT INTO medical_loa (
        employee_id,
        first_name,
        last_name,
        position,
        department,
        hospital_id,
        hospital_name,
        hospital_address,
        hospital_city,
        hospital_province,
        hospital_region,
        visit_date,
        reason_type,
        patient_complaint,
        preferred_doctor,
        status,
        current_approval_level,
        submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      )
      RETURNING id, submitted_at
    `;

    const values = [
      employee.employee_id,
      employee.first_name,
      employee.last_name,
      employee.position,
      employee.department,
      hospitalId,
      hospitalName,
      hospitalAddress,
      hospitalCity,
      hospitalProvince,
      hospitalRegion,
      visitDate,
      reasonType,
      patientComplaint,
      preferredDoctor || null,
      'Pending',
      1  
    ];

    console.log('Executing insert query with values:', values);
    const result = await query(insertQuery, values);
    console.log('Insert result:', result.rows);

    const loaId = result.rows[0].id;

    await createActivityLog({
      userId: employeeId,
      action: 'CREATE',
      module: 'Medical LOA',
      details: `Created medical LOA request for ${hospitalName}`,
      status: 'Success'
    });

    await createApproverNotification({
      requestType: 'medical-loa',
      requestId: loaId,
      approvalLevel: 1
    });

    return NextResponse.json({
      success: true,
      message: 'Medical LOA request submitted successfully',
      id: loaId
    });

  } catch (error: any) {
    console.error('Error submitting medical LOA:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to submit medical LOA request' },
      { status: 500 }
    );
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

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      const sqlQuery = `
        SELECT * FROM medical_loa
        WHERE id = $1 AND employee_id = $2
      `;

      const result = await query(sqlQuery, [id, employeeId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Medical LOA not found or you don't have access" },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    }

    const sqlQuery = `
      SELECT * FROM medical_loa
      WHERE employee_id = $1
      ORDER BY submitted_at DESC
    `;

    const result = await query(sqlQuery, [employeeId]);
    
    return NextResponse.json(result.rows);

  } catch (error: any) {
    console.error('Error fetching medical LOA:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch medical LOA data' },
      { status: 500 }
    );
  }
}