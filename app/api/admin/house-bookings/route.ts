// app/api/admin/house-bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool, { query, transaction } from "../../../utils/database";

// GET: Fetch all bookings or a specific booking by ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    // If fetching a specific booking
    if (id) {
      const sqlQuery = `
        SELECT *
        FROM house_booking
        WHERE id = $1
      `;
      
      const result = await query(sqlQuery, [id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Booking not found'
        }, { status: 404 });
      }
      
      const booking = result.rows[0];
      
      // Get approval information if any
      const approvalQuery = `
        SELECT 
          hba.id,
          hba.approval_level,
          hba.status,
          hba.comment,
          hba.approved_at,
          e.employee_id,
          e.first_name,
          e.last_name,
          e.position
        FROM house_booking_approval hba
        JOIN employees e ON hba.approver_employee_id = e.employee_id
        WHERE hba.house_booking_id = $1
        ORDER BY hba.approval_level ASC
      `;
      
      const approvalResult = await query(approvalQuery, [id]);
      
      return NextResponse.json({
        success: true,
        booking: booking,
        approvals: approvalResult.rows
      });
    }
    // Fetching all bookings
    else {
      const sqlQuery = `
        SELECT *
        FROM house_booking
        ORDER BY submitted_at DESC
      `;
      
      const result = await query(sqlQuery);
      
      return NextResponse.json({
        success: true,
        bookings: result.rows
      });
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings'
    }, { status: 500 });
  }
}

// PUT: Update a booking
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Missing booking ID parameter'
      }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Check if booking exists
    const checkQuery = 'SELECT id FROM house_booking WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }
    
    // Check for booking conflicts if updating dates/times and the booking is being approved
    if (data.status === 'Approved' && (data.checkinDate || data.checkinTime || data.checkoutDate || data.checkoutTime)) {
      const conflictQuery = `
        SELECT COUNT(*) as conflict_count
        FROM house_booking
        WHERE property_name = $1
          AND id != $2
          AND status = 'Approved'
          AND (
            -- Direct time conflicts
            (checkin_date = $3 AND checkin_time <= $4 AND checkout_time > $4)
            OR (checkout_date = $3 AND checkout_time >= $4 AND checkin_time < $4)
            OR (checkin_date = $5 AND checkin_time <= $6 AND checkout_time > $6)
            OR (checkout_date = $5 AND checkout_time >= $6 AND checkin_time < $6)
            OR (checkin_date < $3 AND checkout_date > $3)
            OR (checkin_date < $5 AND checkout_date > $5)
            OR (checkin_date > $3 AND checkout_date < $5)
            OR (checkin_date = $3 AND checkout_date = $5 AND checkin_time < $6 AND checkout_time > $4)
            
            -- Check if booking is within 3 hours after someone else's checkout
            OR (
              checkout_date = $3 
              AND (
                -- Convert checkout_time string to time, add 3 hours, and check if new checkin is within that buffer
                (CAST(checkout_time AS TIME) + INTERVAL '3 hours') > CAST($4 AS TIME)
                AND CAST(checkout_time AS TIME) <= CAST($4 AS TIME)
              )
            )
          )
      `;
      
      const conflictValues = [
        data.propertyName,
        id,
        data.checkinDate,
        data.checkinTime,
        data.checkoutDate,
        data.checkoutTime
      ];
      
      const conflictResult = await query(conflictQuery, conflictValues);
      
      if (conflictResult.rows[0].conflict_count > 0) {
        return NextResponse.json({
          success: false,
          error: 'This property is already booked or within a 3-hour cleaning period during the specified time.'
        }, { status: 409 });
      }
    }
    
    // Use transaction for the update
    const updateQueries = [
      {
        text: `
          UPDATE house_booking
          SET 
            property_name = $1,
            property_location = $2,
            nature_of_stay = $3,
            reason_for_use = $4,
            checkin_date = $5,
            checkin_time = $6,
            checkout_date = $7,
            checkout_time = $8,
            number_of_guests = $9,
            status = $10,
            current_approval_level = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
          RETURNING *
        `,
        params: [
          data.propertyName,
          data.propertyLocation,
          data.natureOfStay,
          data.reasonForUse,
          data.checkinDate,
          data.checkinTime,
          data.checkoutDate,
          data.checkoutTime,
          data.numberOfGuests,
          data.status,
          data.currentApprovalLevel,
          id
        ]
      }
    ];
    
    const results = await transaction(updateQueries);
    
    if (results[0].rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update booking'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: results[0].rows[0]
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update booking'
    }, { status: 500 });
  }
}

// DELETE: Delete a booking
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Missing booking ID parameter'
      }, { status: 400 });
    }
    
    // Check if booking exists
    const checkQuery = 'SELECT id FROM house_booking WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }
    
    // Use transaction for the delete operation
    const deleteQueries = [
      {
        text: 'DELETE FROM house_booking_approval WHERE house_booking_id = $1',
        params: [id]
      },
      {
        text: 'DELETE FROM house_booking WHERE id = $1 RETURNING id',
        params: [id]
      }
    ];
    
    const results = await transaction(deleteQueries);
    
    if (results[1].rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete booking'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete booking'
    }, { status: 500 });
  }
}