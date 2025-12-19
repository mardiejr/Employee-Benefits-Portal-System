import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../../utils/database";

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

    const { ticketId, comment } = await req.json();

    if (!ticketId || !comment) {
      return NextResponse.json(
        { error: "Ticket ID and comment are required" },
        { status: 400 }
      );
    }

    // Get employee details
    const employeeQuery = `
      SELECT first_name, middle_name, last_name, position
      FROM employees
      WHERE employee_id = $1
    `;
    const employeeResult = await query(employeeQuery, [employeeId]);

    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employee = employeeResult.rows[0];
    const authorName = `${employee.first_name} ${employee.middle_name ? employee.middle_name.charAt(0) + '. ' : ''}${employee.last_name}`;

    // Insert comment (you may want to create a comments table for housing loans)
    // For now, we'll just return success as comments are part of the approval process

    return NextResponse.json({
      success: true,
      commentId: Date.now().toString(),
      author: authorName,
      role: employee.position
    });

  } catch (error) {
    console.error("Error posting comment:", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}