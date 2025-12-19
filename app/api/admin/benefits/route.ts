import { NextRequest, NextResponse } from "next/server";
import pool, { query, transaction } from "../../../utils/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    // If fetching a specific benefit
    if (id) {
      let benefit: any = null;
      
      if (type === 'medical-reimbursement') {
        // Fetch medical reimbursement details
        const sqlQuery = `
          SELECT 
            mr.*,
            e.position,
            e.department
          FROM medical_reimbursement mr
          JOIN employees e ON mr.employee_id = e.employee_id
          WHERE mr.id = $1
        `;
        const result = await query(sqlQuery, [id]);
        
        if (result.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Medical reimbursement not found'
          }, { status: 404 });
        }
        
        benefit = result.rows[0];
      } 
      else if (type === 'medical-loa') {
        // Fetch medical LOA details
        const sqlQuery = `
          SELECT * FROM medical_loa
          WHERE id = $1
        `;
        const result = await query(sqlQuery, [id]);
        
        if (result.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Medical LOA not found'
          }, { status: 404 });
        }
        
        benefit = result.rows[0];
      }
      
      return NextResponse.json({
        success: true,
        benefit
      });
    }
    // Fetching all benefits of a specific type or all benefits if no type specified
    else {
      if (type === 'medical-reimbursement') {
        // Fetch all medical reimbursements
        const sqlQuery = `
          SELECT 
            mr.*,
            e.position,
            e.department
          FROM medical_reimbursement mr
          JOIN employees e ON mr.employee_id = e.employee_id
          ORDER BY mr.submitted_at DESC
        `;
        const result = await query(sqlQuery);
        
        return NextResponse.json({
          success: true,
          benefits: result.rows
        });
      } 
      else if (type === 'medical-loa') {
        // Fetch all medical LOAs
        const sqlQuery = `
          SELECT * FROM medical_loa
          ORDER BY submitted_at DESC
        `;
        const result = await query(sqlQuery);
        
        return NextResponse.json({
          success: true,
          benefits: result.rows
        });
      }
      else {
        // Fetch all benefits of all types
        const medicalReimbursementQuery = `
          SELECT 
            mr.*,
            e.position,
            e.department
          FROM medical_reimbursement mr
          JOIN employees e ON mr.employee_id = e.employee_id
          ORDER BY mr.submitted_at DESC
        `;
        const medicalLoaQuery = `SELECT * FROM medical_loa ORDER BY submitted_at DESC`;
        
        const [medicalReimbursementResult, medicalLoaResult] = await Promise.all([
          query(medicalReimbursementQuery),
          query(medicalLoaQuery)
        ]);
        
        return NextResponse.json({
          success: true,
          medicalReimbursements: medicalReimbursementResult.rows,
          medicalLOAs: medicalLoaResult.rows
        });
      }
    }
  } catch (error) {
    console.error('Error fetching benefits:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch benefits'
    }, { status: 500 });
  }
}

// PUT: Update a benefit
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing benefit ID or type parameter'
      }, { status: 400 });
    }
    
    const data = await request.json();
    
    if (type === 'medical-reimbursement') {
      // Update medical reimbursement
      const queries = [
        {
          text: `
            UPDATE medical_reimbursement
            SET 
              total_amount = $1,
              admission_date = $2,
              discharge_date = $3,
              status = $4,
              current_approval_level = $5,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
          `,
          params: [
            data.amount,
            data.admissionDate,
            data.dischargeDate || null,
            data.status,
            data.currentApprovalLevel,
            id
          ]
        }
      ];
      
      const results = await transaction(queries);
      
      if (results[0].rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Medical reimbursement not found or update failed'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Medical reimbursement updated successfully',
        benefit: results[0].rows[0]
      });
    } 
    else if (type === 'medical-loa') {
      // Update medical LOA
      const queries = [
        {
          text: `
            UPDATE medical_loa
            SET 
              hospital_name = $1,
              visit_date = $2,
              reason_type = $3,
              patient_complaint = $4,
              status = $5,
              current_approval_level = $6,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
          `,
          params: [
            data.hospitalName,
            data.visitDate,
            data.reasonType,
            data.patientComplaint,
            data.status,
            data.currentApprovalLevel,
            id
          ]
        }
      ];
      
      const results = await transaction(queries);
      
      if (results[0].rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Medical LOA not found or update failed'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Medical LOA updated successfully',
        benefit: results[0].rows[0]
      });
    } 
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid benefit type'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating benefit:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update benefit'
    }, { status: 500 });
  }
}

// DELETE: Delete a benefit
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing benefit ID or type parameter'
      }, { status: 400 });
    }
    
    let queries = [];
    
    if (type === 'medical-reimbursement') {
      // Delete approvals first due to foreign key constraints
      queries = [
        {
          text: 'DELETE FROM medical_reimbursement_approval WHERE medical_reimbursement_id = $1',
          params: [id]
        },
        {
          text: 'DELETE FROM medical_reimbursement WHERE id = $1 RETURNING id',
          params: [id]
        }
      ];
    } 
    else if (type === 'medical-loa') {
      // Delete approvals first due to foreign key constraints
      queries = [
        {
          text: 'DELETE FROM medical_loa_approval WHERE medical_loa_id = $1',
          params: [id]
        },
        {
          text: 'DELETE FROM medical_loa WHERE id = $1 RETURNING id',
          params: [id]
        }
      ];
    } 
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid benefit type'
      }, { status: 400 });
    }
    
    const results = await transaction(queries);
    
    if (results[1].rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `${type === 'medical-reimbursement' ? 'Medical reimbursement' : 'Medical LOA'} not found or delete failed`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: `${type === 'medical-reimbursement' ? 'Medical reimbursement' : 'Medical LOA'} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting benefit:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete benefit'
    }, { status: 500 });
  }
}