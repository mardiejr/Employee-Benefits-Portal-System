// app/api/user/check-approver/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

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

    // Check if the employee is in the approvers table
    const sqlQuery = `
      SELECT EXISTS(
        SELECT 1 
        FROM approvers 
        WHERE employee_id = $1
      ) AS "isApprover"
    `;
    
    const result = await query(sqlQuery, [employeeId]);
    
    // Return whether the user is an approver
    return NextResponse.json({
      isApprover: result.rows[0].isApprover
    });
    
  } catch (error) {
    console.error("Error checking approver status:", error);
    return NextResponse.json(
      { error: "Failed to check approver status" },
      { status: 500 }
    );
  }
}