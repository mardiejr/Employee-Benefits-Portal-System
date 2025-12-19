// app/api/house-booking/cancel/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "../../../utils/database";

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

    const { bookingId, cancelReason } = await req.json();
    
    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Verify the booking belongs to this employee
    const checkQuery = `
      SELECT * FROM house_booking 
      WHERE id = $1 AND employee_id = $2
    `;
    
    const checkResult = await query(checkQuery, [bookingId, employeeId]);
    
    if (checkResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Booking not found or you don't have permission to cancel it" },
        { status: 404 }
      );
    }

    const booking = checkResult.rows[0];

    // Check if there's already an approval record for this booking at the current level
    const checkApprovalQuery = `
      SELECT id FROM house_booking_approval 
      WHERE house_booking_id = $1 AND approval_level = $2
    `;
    
    const approvalCheck = await query(checkApprovalQuery, [
      bookingId, 
      booking.current_approval_level
    ]);
    
    const commentText = cancelReason 
      ? `Booking cancelled by employee. Reason: ${cancelReason}`
      : 'Booking cancelled by employee';
    
    // Build transaction queries
    const queries = [];
    
    // 1. Update booking status to Cancelled
    queries.push({
      text: `
        UPDATE house_booking
        SET status = 'Cancelled', 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      params: [bookingId]
    });
    
    // 2. Either update or insert approval record
    if (approvalCheck && approvalCheck.rowCount && approvalCheck.rowCount > 0) {
      // Update existing approval record
      queries.push({
        text: `
          UPDATE house_booking_approval 
          SET status = 'Cancelled', 
              comment = $1,
              approver_employee_id = $2,
              approved_at = CURRENT_TIMESTAMP
          WHERE house_booking_id = $3 AND approval_level = $4
        `,
        params: [
          commentText,
          employeeId,
          bookingId,
          booking.current_approval_level
        ]
      });
    } else {
      // Insert new approval record
      queries.push({
        text: `
          INSERT INTO house_booking_approval 
          (house_booking_id, approver_employee_id, approval_level, status, comment)
          VALUES ($1, $2, $3, 'Cancelled', $4)
        `,
        params: [
          bookingId, 
          employeeId, 
          booking.current_approval_level,
          commentText
        ]
      });
    }
    
    // Execute all queries in a transaction
    const results = await transaction(queries);
    const updatedBooking = results[0].rows[0];
    
    return NextResponse.json({
      success: true,
      message: "Booking has been successfully cancelled",
      booking: updatedBooking
    });

  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}