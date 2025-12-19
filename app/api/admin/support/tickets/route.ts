// app/api/admin/support/tickets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool, { query, transaction } from "../../../../utils/database";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // No approvers check - consistent with other admin APIs

    const sqlQuery = `
      SELECT 
        st.id,
        st.employee_id,
        st.first_name,
        st.middle_name,
        st.last_name,
        st.email,
        st.category,
        st.subject,
        st.description,
        st.attachment_path,
        st.status,
        st.resolution_comment,
        st.submitted_at,
        st.updated_at
      FROM support_tickets st
      ORDER BY 
        CASE WHEN st.status = 'Unread' THEN 0
             WHEN st.status = 'In Progress' THEN 1
             WHEN st.status = 'Read' THEN 2
             WHEN st.status = 'Resolved' THEN 3
        END,
        st.submitted_at DESC
    `;

    const result = await query(sqlQuery);

    return NextResponse.json({
      success: true,
      tickets: result.rows,
      unreadCount: result.rows.filter(ticket => ticket.status === 'Unread').length
    });

  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminEmployeeId = cookieStore.get('employee_id')?.value;

    if (!adminEmployeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // No approvers check - consistent with other admin APIs

    const { ticketId, status, resolutionComment } = await request.json();

    if (!ticketId || !status) {
      return NextResponse.json(
        { error: "Ticket ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ['Unread', 'Read', 'In Progress', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // First, check if this is a status change to "Resolved"
    const checkQuery = `
      SELECT status, employee_id, subject FROM support_tickets 
      WHERE id = $1
    `;
    const checkResult = await query(checkQuery, [ticketId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const previousStatus = checkResult.rows[0].status;
    const employeeId = checkResult.rows[0].employee_id;
    const ticketSubject = checkResult.rows[0].subject;

    // Prepare transaction queries
    let queries = [];

    // Update the ticket
    const updateQuery = {
      text: `
        UPDATE support_tickets
        SET 
          status = $1, 
          updated_at = CURRENT_TIMESTAMP
          ${resolutionComment ? ', resolution_comment = $3' : ''}
        WHERE id = $2
        RETURNING *
      `,
      params: resolutionComment
        ? [status, ticketId, resolutionComment]
        : [status, ticketId]
    };

    queries.push(updateQuery);

    // If status changed to "Resolved" and we have a resolution comment, create a notification
    if (status === 'Resolved' && previousStatus !== 'Resolved' && resolutionComment) {
      // First check if the notifications table exists
      const checkTableQuery = {
        text: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
          );
        `,
        params: []
      };

      queries.push(checkTableQuery);

      // Create notification if table exists
      const createNotificationQuery = {
        text: `
          INSERT INTO notifications (
            employee_id, 
            type, 
            title, 
            message, 
            reference_id, 
            reference_type
          ) VALUES (
            $1, 'support_resolved', $2, $3, $4, 'support_ticket'
          )
        `,
        params: [
          employeeId,
          `Support ticket resolved: ${ticketSubject}`,
          resolutionComment,
          ticketId
        ]
      };

      queries.push(createNotificationQuery);
    }

    // Execute the transaction
    try {
      const results = await transaction(queries);

      return NextResponse.json({
        success: true,
        message: "Ticket status updated successfully",
        ticket: results[0].rows[0]
      });
    } catch (error: any) {
      // Check if error is about missing notifications table
      if (error.message && error.message.includes('notifications')) {
        // Create the notifications table and try again without the notification
        await query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            reference_id INTEGER,
            reference_type VARCHAR(50),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create index for efficient queries
          CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON notifications(employee_id);
          CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
          CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        `);

        // Retry just the update query
        const updateResult = await query(updateQuery.text, updateQuery.params);

        return NextResponse.json({
          success: true,
          message: "Ticket status updated successfully (without notification)",
          ticket: updateResult.rows[0]
        });
      }

      // Re-throw for general errors
      throw error;
    }

  } catch (error) {
    console.error("Error updating ticket status:", error);
    return NextResponse.json(
      { error: "Failed to update ticket status" },
      { status: 500 }
    );
  }
}