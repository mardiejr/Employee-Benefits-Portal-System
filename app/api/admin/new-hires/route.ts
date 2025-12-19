// app/api/admin/new-hires/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool, { query, transaction } from "../../../utils/database";

// Helper function to create audit log entry
async function createActivityLog(params: {
  userId: string;
  action: string;
  module: string;
  details: string;
  status: string;
}) {
  try {
    await query(`
      INSERT INTO activity_logs (
        user_id,
        action,
        module,
        details,
        status,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW()
      )
    `, [
      params.userId,
      params.action,
      params.module,
      params.details,
      params.status
    ]);
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
}

// GET: Fetch all new hires
export async function GET(request: NextRequest) {
  try {
    const sqlQuery = `
      SELECT 
        id,
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        gender,
        nationality,
        address,
        phone_number,
        department,
        position,
        hire_date,
        benefits_package,
        benefits_amount_remaining,
        created_at
      FROM new_hires
      ORDER BY created_at DESC
    `;
    
    const result = await query(sqlQuery);
    
    // Transform the data to match the client-side expected format
    const newHires = result.rows.map(row => {
      // Ensure the hire_date is properly formatted for the date input
      let formattedHireDate = '';
      if (row.hire_date) {
        // Convert PostgreSQL date to YYYY-MM-DD format for date input
        const date = new Date(row.hire_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedHireDate = `${year}-${month}-${day}`;
      }
      
      return {
        id: row.id,
        employeeId: row.employee_id || '',
        firstName: row.first_name,
        middleName: row.middle_name || '',
        lastName: row.last_name,
        email: row.email || '',
        gender: row.gender || '',
        nationality: row.nationality || '',
        address: row.address || '',
        phoneNumber: row.phone_number || '',
        department: row.department || '',
        position: row.position || '',
        hireDate: formattedHireDate,
        benefits_package: row.benefits_package || '',
        benefits_amount_remaining: parseFloat(row.benefits_amount_remaining || 0)
      };
    });
    
    return NextResponse.json({
      success: true,
      newHires: newHires
    });
  } catch (error) {
    console.error('Error fetching new hires:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch new hires'
    }, { status: 500 });
  }
}

// Helper to determine benefits package based on role class
const getBenefitsPackage = (roleClass: string) => {
  if (roleClass === "Class A" || roleClass === "Class B") {
    return {
      package: "Package B",
      amount: 200000
    };
  } else if (roleClass === "Class C") {
    return {
      package: "Package A",
      amount: 100000
    };
  }
  return {
    package: "Package A",  // Default to Package A for new hires
    amount: 100000
  };
};

// POST: Add a new hire
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Generate employee ID for new hire
    const employeeIdPrefix = 'NH';
    const countResult = await query('SELECT COUNT(*) FROM new_hires');
    const count = parseInt(countResult.rows[0].count) + 1;
    const employeeId = `${employeeIdPrefix}${count.toString().padStart(3, '0')}`;
    
    // Determine role class from position if available
    let roleClass = "Class C";  // Default to Class C
    if (data.position) {
      // You might have a utility function to get the role class from position
      // For this example, we'll set a simple rule
      if (data.position.toLowerCase().includes('manager') || 
          data.position.toLowerCase().includes('director') ||
          data.position.toLowerCase().includes('executive')) {
        roleClass = "Class A";
      } else if (data.position.toLowerCase().includes('supervisor') ||
                data.position.toLowerCase().includes('lead')) {
        roleClass = "Class B";
      }
    }
    
    // Get benefits package based on role class
    const benefitsPackage = getBenefitsPackage(roleClass);
    
    // Insert the new hire
    const result = await query(`
      INSERT INTO new_hires (
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        gender,
        nationality,
        address,
        phone_number,
        department,
        position,
        hire_date,
        benefits_package,
        benefits_amount_remaining,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING 
        id,
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        gender,
        nationality,
        address,
        phone_number,
        department,
        position,
        hire_date,
        benefits_package,
        benefits_amount_remaining
    `, [
      employeeId,
      data.firstName,
      data.middleName || null,
      data.lastName,
      data.email,
      data.gender,
      data.nationality,
      data.address,
      data.phoneNumber,
      data.department,
      data.position,
      data.hireDate,
      benefitsPackage.package,
      benefitsPackage.amount
    ]);
    
    // Format the hire date for response
    let hireDate = '';
    if (result.rows[0].hire_date) {
      const date = new Date(result.rows[0].hire_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      hireDate = `${year}-${month}-${day}`;
    }
    
    // Transform the returned data to match the client-side expected format
    const newHire = {
      id: result.rows[0].id,
      employeeId: result.rows[0].employee_id,
      firstName: result.rows[0].first_name,
      middleName: result.rows[0].middle_name || '',
      lastName: result.rows[0].last_name,
      email: result.rows[0].email || '',
      gender: result.rows[0].gender || '',
      nationality: result.rows[0].nationality || '',
      address: result.rows[0].address || '',
      phoneNumber: result.rows[0].phone_number || '',
      department: result.rows[0].department || '',
      position: result.rows[0].position || '',
      hireDate: hireDate,
      benefits_package: result.rows[0].benefits_package || '',
      benefits_amount_remaining: parseFloat(result.rows[0].benefits_amount_remaining || 0)
    };
    
    // Create audit log
    await createActivityLog({
      userId: request.headers.get('x-user-id') || 'Unknown',
      action: 'CREATE',
      module: 'New Hires',
      details: `Added new hire: ${data.firstName} ${data.lastName}`,
      status: 'Success'
    });
    
    return NextResponse.json({
      success: true,
      newHire: newHire
    });
  } catch (error) {
    console.error('Error adding new hire:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to add new hire'
    }, { status: 500 });
  }
}

// PUT: Update a new hire
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'New hire ID is required'
      }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Determine role class from position if available
    let roleClass = "Class C";  // Default to Class C
    if (data.position) {
      // You might have a utility function to get the role class from position
      // For this example, we'll set a simple rule
      if (data.position.toLowerCase().includes('manager') || 
          data.position.toLowerCase().includes('director') ||
          data.position.toLowerCase().includes('executive')) {
        roleClass = "Class A";
      } else if (data.position.toLowerCase().includes('supervisor') ||
                data.position.toLowerCase().includes('lead')) {
        roleClass = "Class B";
      }
    }
    
    // Get benefits package based on role class
    const benefitsPackage = data.benefits_package ? 
      { package: data.benefits_package, amount: data.benefits_amount_remaining } : 
      getBenefitsPackage(roleClass);
    
    // Update the new hire
    const result = await query(`
      UPDATE new_hires SET
        first_name = $1,
        middle_name = $2,
        last_name = $3,
        email = $4,
        gender = $5,
        nationality = $6,
        address = $7,
        phone_number = $8,
        department = $9,
        position = $10,
        hire_date = $11,
        benefits_package = $12,
        benefits_amount_remaining = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING 
        id,
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        gender,
        nationality,
        address,
        phone_number,
        department,
        position,
        hire_date,
        benefits_package,
        benefits_amount_remaining
    `, [
      data.firstName,
      data.middleName || null,
      data.lastName,
      data.email,
      data.gender,
      data.nationality,
      data.address,
      data.phoneNumber,
      data.department,
      data.position,
      data.hireDate,
      benefitsPackage.package,
      benefitsPackage.amount,
      id
    ]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'New hire not found'
      }, { status: 404 });
    }
    
    // Format the hire date for response
    let hireDate = '';
    if (result.rows[0].hire_date) {
      const date = new Date(result.rows[0].hire_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      hireDate = `${year}-${month}-${day}`;
    }
    
    // Transform the returned data to match the client-side expected format
    const updatedNewHire = {
      id: result.rows[0].id,
      employeeId: result.rows[0].employee_id,
      firstName: result.rows[0].first_name,
      middleName: result.rows[0].middle_name || '',
      lastName: result.rows[0].last_name,
      email: result.rows[0].email || '',
      gender: result.rows[0].gender || '',
      nationality: result.rows[0].nationality || '',
      address: result.rows[0].address || '',
      phoneNumber: result.rows[0].phone_number || '',
      department: result.rows[0].department || '',
      position: result.rows[0].position || '',
      hireDate: hireDate,
      benefits_package: result.rows[0].benefits_package || '',
      benefits_amount_remaining: parseFloat(result.rows[0].benefits_amount_remaining || 0)
    };
    
    // Create audit log
    await createActivityLog({
      userId: request.headers.get('x-user-id') || 'Unknown',
      action: 'UPDATE',
      module: 'New Hires',
      details: `Updated new hire: ${data.firstName} ${data.lastName}`,
      status: 'Success'
    });
    
    return NextResponse.json({
      success: true,
      newHire: updatedNewHire
    });
    
  } catch (error) {
    console.error('Error updating new hire:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update new hire'
    }, { status: 500 });
  }
}

// DELETE: Remove a new hire
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'New hire ID is required'
      }, { status: 400 });
    }
    
    // Get new hire details before deletion for the audit log
    const hireResult = await query(`
      SELECT employee_id, first_name, last_name
      FROM new_hires
      WHERE id = $1
    `, [id]);
    
    if (hireResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'New hire not found'
      }, { status: 404 });
    }
    
    const hire = hireResult.rows[0];
    
    // Delete the new hire
    await query('DELETE FROM new_hires WHERE id = $1', [id]);
    
    // Create audit log
    await createActivityLog({
      userId: request.headers.get('x-user-id') || 'Unknown',
      action: 'DELETE',
      module: 'New Hires',
      details: `Deleted new hire record: ${hire.first_name} ${hire.last_name} (${hire.employee_id})`,
      status: 'Success'
    });
    
    return NextResponse.json({
      success: true,
      message: 'New hire deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting new hire:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete new hire'
    }, { status: 500 });
  }
}