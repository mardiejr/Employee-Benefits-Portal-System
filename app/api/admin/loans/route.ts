import { NextRequest, NextResponse } from "next/server";
import pool, { query, transaction } from "../../../utils/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    // If fetching a specific loan
    if (id) {
      let loan: any = null;
      
      if (type === 'salary') {
        // Fetch salary loan details
        const sqlQuery = `
          SELECT * FROM salary_loan
          WHERE id = $1
        `;
        const result = await query(sqlQuery, [id]);
        
        if (result.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Salary loan not found'
          }, { status: 404 });
        }
        
        loan = result.rows[0];
      } 
      else if (type === 'housing') {
        // Fetch housing loan details
        const sqlQuery = `
          SELECT * FROM housing_loan
          WHERE id = $1
        `;
        const result = await query(sqlQuery, [id]);
        
        if (result.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Housing loan not found'
          }, { status: 404 });
        }
        
        loan = result.rows[0];
      } 
      else if (type === 'car') {
        // Fetch car loan details
        const sqlQuery = `
          SELECT * FROM car_loan
          WHERE id = $1
        `;
        const result = await query(sqlQuery, [id]);
        
        if (result.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Car loan not found'
          }, { status: 404 });
        }
        
        loan = result.rows[0];
      }
      
      return NextResponse.json({
        success: true,
        loan
      });
    }
    // Fetching all loans of a specific type or all loans if no type specified
    else {
      if (type === 'salary') {
        // Fetch all salary loans
        const sqlQuery = `
          SELECT 
            id,
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
            current_approval_level,
            submitted_at,
            updated_at
          FROM salary_loan
          ORDER BY submitted_at DESC
        `;
        const result = await query(sqlQuery);
        
        return NextResponse.json({
          success: true,
          loans: result.rows
        });
      } 
      else if (type === 'housing') {
        // Fetch all housing loans with comaker_file_path instead of payslip and company ID
        const sqlQuery = `
          SELECT 
            id,
            employee_id,
            first_name,
            last_name,
            position,
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
            current_approval_level,
            submitted_at,
            updated_at
          FROM housing_loan
          ORDER BY submitted_at DESC
        `;
        const result = await query(sqlQuery);
        
        return NextResponse.json({
          success: true,
          loans: result.rows
        });
      } 
      else if (type === 'car') {
        // Fetch all car loans with comaker_file_path instead of payslip and company ID
        const sqlQuery = `
          SELECT 
            id,
            employee_id,
            first_name,
            last_name,
            position,
            car_make,
            car_model,
            car_year,
            vehicle_price,
            dealer_name,
            loan_amount_requested,
            repayment_term,
            comaker_file_path,
            car_quotation_file_path,
            status,
            current_approval_level,
            submitted_at,
            updated_at
          FROM car_loan
          ORDER BY submitted_at DESC
        `;
        const result = await query(sqlQuery);
        
        return NextResponse.json({
          success: true,
          loans: result.rows
        });
      }
      else {
        // Fetch all loans of all types
        const salaryLoansQuery = `
          SELECT 
            id,
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
            current_approval_level,
            submitted_at,
            updated_at
          FROM salary_loan 
          ORDER BY submitted_at DESC
        `;
        
        const housingLoansQuery = `
          SELECT 
            id,
            employee_id,
            first_name,
            last_name,
            position,
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
            current_approval_level,
            submitted_at,
            updated_at
          FROM housing_loan 
          ORDER BY submitted_at DESC
        `;
        
        const carLoansQuery = `
          SELECT 
            id,
            employee_id,
            first_name,
            last_name,
            position,
            car_make,
            car_model,
            car_year,
            vehicle_price,
            dealer_name,
            loan_amount_requested,
            repayment_term,
            comaker_file_path,
            car_quotation_file_path,
            status,
            current_approval_level,
            submitted_at,
            updated_at
          FROM car_loan 
          ORDER BY submitted_at DESC
        `;
        
        const [salaryLoansResult, housingLoansResult, carLoansResult] = await Promise.all([
          query(salaryLoansQuery),
          query(housingLoansQuery),
          query(carLoansQuery)
        ]);
        
        return NextResponse.json({
          success: true,
          salaryLoans: salaryLoansResult.rows,
          housingLoans: housingLoansResult.rows,
          carLoans: carLoansResult.rows
        });
      }
    }
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch loans'
    }, { status: 500 });
  }
}

// PUT: Update a loan
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing loan ID or type parameter'
      }, { status: 400 });
    }
    
    const data = await request.json();
    
    if (type === 'salary') {
      // Update salary loan
      const updateQuery = {
        text: `
          UPDATE salary_loan
          SET 
            loan_amount = $1,
            loan_purpose = $2,
            repayment_term = $3,
            status = $4,
            current_approval_level = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
          RETURNING *
        `,
        params: [
          data.loanAmount,
          data.loanPurpose,
          data.repaymentTerm,
          data.status,
          data.currentApprovalLevel,
          id
        ]
      };
      
      const results = await transaction([updateQuery]);
      
      if (results[0].rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Salary loan not found or update failed'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Salary loan updated successfully',
        loan: results[0].rows[0]
      });
    } 
    else if (type === 'housing') {
      // Update housing loan
      const updateQuery = {
        text: `
          UPDATE housing_loan
          SET 
            loan_amount_requested = $1,
            property_type = $2,
            property_address = $3,
            repayment_term = $4,
            seller_name = $5,
            status = $6,
            current_approval_level = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
          RETURNING *
        `,
        params: [
          data.loanAmount,
          data.propertyType,
          data.propertyAddress,
          data.repaymentTerm,
          data.sellerName,
          data.status,
          data.currentApprovalLevel,
          id
        ]
      };
      
      const results = await transaction([updateQuery]);
      
      if (results[0].rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Housing loan not found or update failed'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Housing loan updated successfully',
        loan: results[0].rows[0]
      });
    } 
    else if (type === 'car') {
      // Update car loan
      const updateQuery = {
        text: `
          UPDATE car_loan
          SET 
            loan_amount_requested = $1,
            car_make = $2,
            car_model = $3,
            car_year = $4,
            dealer_name = $5,
            repayment_term = $6,
            status = $7,
            current_approval_level = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
          RETURNING *
        `,
        params: [
          data.loanAmount,
          data.carMake,
          data.carModel,
          data.carYear,
          data.dealerName,
          data.repaymentTerm,
          data.status,
          data.currentApprovalLevel,
          id
        ]
      };
      
      const results = await transaction([updateQuery]);
      
      if (results[0].rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Car loan not found or update failed'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Car loan updated successfully',
        loan: results[0].rows[0]
      });
    } 
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid loan type'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update loan'
    }, { status: 500 });
  }
}

// DELETE: Delete a loan
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing loan ID or type parameter'
      }, { status: 400 });
    }
    
    let queries = [];
    
    if (type === 'salary') {
      // Delete approvals first due to foreign key constraints
      queries = [
        {
          text: 'DELETE FROM salary_loan_approval WHERE salary_loan_id = $1',
          params: [id]
        },
        {
          text: 'DELETE FROM salary_loan WHERE id = $1 RETURNING id',
          params: [id]
        }
      ];
    } 
    else if (type === 'housing') {
      // Delete approvals first due to foreign key constraints
      queries = [
        {
          text: 'DELETE FROM housing_loan_approval WHERE housing_loan_id = $1',
          params: [id]
        },
        {
          text: 'DELETE FROM housing_loan WHERE id = $1 RETURNING id',
          params: [id]
        }
      ];
    } 
    else if (type === 'car') {
      // Delete approvals first due to foreign key constraints
      queries = [
        {
          text: 'DELETE FROM car_loan_approval WHERE car_loan_id = $1',
          params: [id]
        },
        {
          text: 'DELETE FROM car_loan WHERE id = $1 RETURNING id',
          params: [id]
        }
      ];
    } 
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid loan type'
      }, { status: 400 });
    }
    
    const results = await transaction(queries);
    
    if (results[1].rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} loan not found or delete failed`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} loan deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete loan'
    }, { status: 500 });
  }
}