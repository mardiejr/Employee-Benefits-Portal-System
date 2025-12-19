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
    // Insert into activity_logs table
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

// GET: Fetch all employees or a specific employee
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  try {
    let sqlQuery, values: any[] = [], result;
    
    if (id) {
      // Fetch single employee by ID
      sqlQuery = `
        SELECT 
          id,
          employee_id,
          first_name,
          middle_name,
          last_name,
          email,
          position,
          department,
          is_active,
          hire_date,
          phone_number,
          gender,
          nationality,
          address,
          salary,
          role_class,
          benefits_package,
          benefits_amount_remaining
        FROM employees
        WHERE id = $1
      `;
      values = [id];
      result = await query(sqlQuery, values);
      
      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Employee not found'
        }, { status: 404 });
      }
      
      // Transform the data to match the client-side expected format
      const employee = {
        id: result.rows[0].id,
        employeeId: result.rows[0].employee_id,
        firstName: result.rows[0].first_name,
        middleName: result.rows[0].middle_name || '',
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        position: result.rows[0].position,
        department: result.rows[0].department,
        status: result.rows[0].is_active ? "Active" : "Inactive",
        hireDate: result.rows[0].hire_date,
        phoneNumber: result.rows[0].phone_number,
        gender: result.rows[0].gender || '',
        nationality: result.rows[0].nationality || '',
        address: result.rows[0].address || '',
        salary: parseFloat(result.rows[0].salary),
        role: result.rows[0].role_class,
        benefits_package: result.rows[0].benefits_package || '',
        benefits_amount_remaining: parseFloat(result.rows[0].benefits_amount_remaining || 0)
      };
      
      // Create audit log
      await createActivityLog({
        userId: request.headers.get('x-user-id') || 'Unknown',
        action: 'VIEW',
        module: 'Employee Management',
        details: `Retrieved employee record: ${employee.firstName} ${employee.lastName}`,
        status: 'Success'
      });
      
      return NextResponse.json({
        success: true,
        employee: employee
      });
      
    } else {
      // Fetch all employees
      sqlQuery = `
        SELECT 
          id,
          employee_id,
          first_name,
          middle_name,
          last_name,
          email,
          position,
          department,
          is_active,
          hire_date,
          phone_number,
          gender,
          nationality,
          address,
          salary,
          role_class,
          benefits_package,
          benefits_amount_remaining
        FROM employees
        ORDER BY last_name ASC
      `;
      result = await query(sqlQuery);
      
      // Transform the data to match the client-side expected format
      const employees = result.rows.map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        firstName: row.first_name,
        middleName: row.middle_name || '',
        lastName: row.last_name,
        email: row.email,
        position: row.position,
        department: row.department,
        status: row.is_active ? "Active" : "Inactive",
        hireDate: row.hire_date,
        phoneNumber: row.phone_number,
        gender: row.gender || '',
        nationality: row.nationality || '',
        address: row.address || '',
        salary: parseFloat(row.salary),
        role: row.role_class,
        benefits_package: row.benefits_package || '',
        benefits_amount_remaining: parseFloat(row.benefits_amount_remaining || 0)
      }));
      
      // Create audit log
      await createActivityLog({
        userId: request.headers.get('x-user-id') || 'Unknown',
        action: 'VIEW',
        module: 'Employee Management',
        details: 'Retrieved all employee records',
        status: 'Success'
      });
      
      return NextResponse.json({
        success: true,
        employees: employees
      });
    }
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch employees'
    }, { status: 500 });
  }
}

// POST: Add a new employee
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if employee ID already exists
    const checkResult = await query(
      'SELECT COUNT(*) FROM employees WHERE employee_id = $1',
      [data.employeeId]
    );
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID already exists'
      }, { status: 400 });
    }
    
    // Convert status to is_active for database
    const isActive = data.status === "Active";
    
    // Convert role to role_class for database if needed
    let roleClass = data.roleClass || data.role_class || data.role;
    
    // Get benefits package and amount
    let benefits_package = data.benefits_package;
    let benefits_amount = data.benefits_amount_remaining;
    
    // If benefits package is not provided, set default based on role class
    if (!benefits_package) {
      if (roleClass === 'Class A' || roleClass === 'Class B') {
        benefits_package = 'Package B';
        benefits_amount = 200000;
      } else if (roleClass === 'Class C') {
        benefits_package = 'Package A';
        benefits_amount = 100000;
      }
    }
    
    // Insert new employee with additional fields
    const result = await query(`
      INSERT INTO employees (
        employee_id,
        password,
        first_name,
        middle_name,
        last_name,
        email,
        position,
        department,
        gender,
        nationality,
        address,
        is_active,
        hire_date,
        phone_number,
        salary,
        role_class,
        benefits_package,
        benefits_amount_remaining,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      ) RETURNING 
        id,
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        position,
        department,
        gender,
        nationality,
        address,
        is_active,
        hire_date,
        phone_number,
        salary,
        role_class,
        benefits_package,
        benefits_amount_remaining
    `, [
      data.employeeId,
      'password123', // Default password - should be hashed in production
      data.firstName,
      data.middleName || null,
      data.lastName,
      data.email,
      data.position,
      data.department,
      data.gender || null,
      data.nationality || null,
      data.address || null,
      isActive,
      data.hireDate,
      data.phoneNumber,
      data.salary,
      roleClass,
      benefits_package,
      benefits_amount
    ]);
    
    // Transform the returned data to match the client-side expected format
    const newEmployee = {
      id: result.rows[0].id,
      employeeId: result.rows[0].employee_id,
      firstName: result.rows[0].first_name,
      middleName: result.rows[0].middle_name || '',
      lastName: result.rows[0].last_name,
      email: result.rows[0].email,
      position: result.rows[0].position,
      department: result.rows[0].department,
      gender: result.rows[0].gender || '',
      nationality: result.rows[0].nationality || '',
      address: result.rows[0].address || '',
      status: result.rows[0].is_active ? "Active" : "Inactive",
      hireDate: result.rows[0].hire_date,
      phoneNumber: result.rows[0].phone_number,
      salary: parseFloat(result.rows[0].salary),
      role: result.rows[0].role_class,
      benefits_package: result.rows[0].benefits_package || '',
      benefits_amount_remaining: parseFloat(result.rows[0].benefits_amount_remaining || 0)
    };
    
    // If this was from a new hire, delete the new hire record
    if (data.newHireId) {
      try {
        await query('DELETE FROM new_hires WHERE id = $1', [data.newHireId]);
        console.log(`New hire record (ID: ${data.newHireId}) removed after employee creation`);
      } catch (error) {
        console.error(`Error removing new hire record (ID: ${data.newHireId}):`, error);
        // Continue with the operation even if deleting the new hire fails
      }
    }
    
    // Create audit log
    await createActivityLog({
      userId: request.headers.get('x-user-id') || 'Unknown',
      action: 'CREATE',
      module: 'Employee Management',
      details: `Created new employee: ${data.firstName} ${data.lastName} (${data.employeeId})`,
      status: 'Success'
    });
    
    return NextResponse.json({
      success: true,
      employee: newEmployee
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to add employee'
    }, { status: 500 });
  }
}

// PUT: Update an employee
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Check if employee exists
    const checkResult = await query(
      'SELECT COUNT(*) FROM employees WHERE id = $1',
      [id]
    );
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }
    
    // Check if the new employee_id already exists (but not for this employee)
    const dupCheckResult = await query(
      'SELECT COUNT(*) FROM employees WHERE employee_id = $1 AND id != $2',
      [data.employeeId, id]
    );
    
    if (parseInt(dupCheckResult.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID already exists for another employee'
      }, { status: 400 });
    }
    
    // Convert status to is_active for database
    const isActive = data.status === "Active";
    
    // Convert role to role_class for database if needed
    let roleClass = data.roleClass || data.role_class || data.role;
    
    // Get benefits package and amount
    let benefits_package = data.benefits_package;
    let benefits_amount = data.benefits_amount_remaining;
    
    // If benefits package is not provided, set default based on role class
    if (!benefits_package) {
      if (roleClass === 'Class A' || roleClass === 'Class B') {
        benefits_package = 'Package B';
        benefits_amount = 200000;
      } else if (roleClass === 'Class C') {
        benefits_package = 'Package A';
        benefits_amount = 100000;
      }
    }
    
    // Update the employee with additional fields
    const result = await query(`
      UPDATE employees SET
        employee_id = $1,
        first_name = $2,
        middle_name = $3,
        last_name = $4,
        email = $5,
        position = $6,
        department = $7,
        gender = $8,
        nationality = $9,
        address = $10,
        is_active = $11,
        hire_date = $12,
        phone_number = $13,
        salary = $14,
        role_class = $15,
        benefits_package = $16,
        benefits_amount_remaining = $17,
        updated_at = NOW()
      WHERE id = $18
      RETURNING 
        id,
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        position,
        department,
        gender,
        nationality,
        address,
        is_active,
        hire_date,
        phone_number,
        salary,
        role_class,
        benefits_package,
        benefits_amount_remaining
    `, [
      data.employeeId,
      data.firstName,
      data.middleName || null,
      data.lastName,
      data.email,
      data.position,
      data.department,
      data.gender || null,
      data.nationality || null,
      data.address || null,
      isActive,
      data.hireDate,
      data.phoneNumber,
      data.salary,
      roleClass,
      benefits_package,
      benefits_amount,
      id
    ]);
    
    // Transform the returned data to match the client-side expected format
    const updatedEmployee = {
      id: result.rows[0].id,
      employeeId: result.rows[0].employee_id,
      firstName: result.rows[0].first_name,
      middleName: result.rows[0].middle_name || '',
      lastName: result.rows[0].last_name,
      email: result.rows[0].email,
      position: result.rows[0].position,
      department: result.rows[0].department,
      gender: result.rows[0].gender || '',
      nationality: result.rows[0].nationality || '',
      address: result.rows[0].address || '',
      status: result.rows[0].is_active ? "Active" : "Inactive",
      hireDate: result.rows[0].hire_date,
      phoneNumber: result.rows[0].phone_number,
      salary: parseFloat(result.rows[0].salary),
      role: result.rows[0].role_class,
      benefits_package: result.rows[0].benefits_package || '',
      benefits_amount_remaining: parseFloat(result.rows[0].benefits_amount_remaining || 0)
    };
    
    // Create audit log
    await createActivityLog({
      userId: request.headers.get('x-user-id') || 'Unknown',
      action: 'UPDATE',
      module: 'Employee Management',
      details: `Updated employee record: ${data.firstName} ${data.lastName} (${data.employeeId})`,
      status: 'Success'
    });
    
    return NextResponse.json({
      success: true,
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update employee'
    }, { status: 500 });
  }
}

// DELETE: Remove an employee
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 });
    }
    
    // Get employee details before deletion for the audit log
    const employeeResult = await query(`
      SELECT employee_id, first_name, middle_name, last_name
      FROM employees
      WHERE id = $1
    `, [id]);
    
    if (employeeResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }
    
    const employee = employeeResult.rows[0];
    
    // Delete the employee
    await query('DELETE FROM employees WHERE id = $1', [id]);
    
    // Create audit log
    await createActivityLog({
      userId: request.headers.get('x-user-id') || 'Unknown',
      action: 'DELETE',
      module: 'Employee Management',
      details: `Deleted employee record: ${employee.first_name} ${employee.middle_name ? employee.middle_name + ' ' : ''}${employee.last_name} (${employee.employee_id})`,
      status: 'Success'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete employee'
    }, { status: 500 });
  }
}