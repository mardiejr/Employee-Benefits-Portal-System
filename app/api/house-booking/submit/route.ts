// app/api/house-booking/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApproverNotification } from "../../../utils/notification-util";
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

    const body = await req.json();
    const {
      firstName,
      lastName,
      position,
      department,
      propertyName,
      propertyLocation,
      natureOfStay,
      reasonForUse,
      checkinDate,
      checkinTime,
      checkoutDate,
      checkoutTime,
      numberOfGuests
    } = body;

    // Basic field validation
    if (!firstName || !lastName || !position || !department) {
      return NextResponse.json(
        { error: "Employee information is required" },
        { status: 400 }
      );
    }

    if (!propertyName || !propertyLocation) {
      return NextResponse.json(
        { error: "Property information is required" },
        { status: 400 }
      );
    }

    if (!natureOfStay || !reasonForUse) {
      return NextResponse.json(
        { error: "Nature of stay and reason for use are required" },
        { status: 400 }
      );
    }

    if (!checkinDate || !checkinTime || !checkoutDate || !checkoutTime) {
      return NextResponse.json(
        { error: "Check-in and check-out date and time are required" },
        { status: 400 }
      );
    }

    if (!numberOfGuests || parseInt(numberOfGuests) < 1) {
      return NextResponse.json(
        { error: "Number of guests must be at least 1" },
        { status: 400 }
      );
    }

    // Validate dates
    const checkin = new Date(`${checkinDate}T${checkinTime}`);
    const checkout = new Date(`${checkoutDate}T${checkoutTime}`);
    const now = new Date();

    // Compare date components separately from time
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const checkinDay = new Date(checkin);
    checkinDay.setHours(0, 0, 0, 0);

    // Only validate time if the date is today
    if (checkinDay.getTime() === today.getTime()) {
      const [checkinHours, checkinMinutes] = checkinTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (checkinHours < currentHour || (checkinHours === currentHour && checkinMinutes <= currentMinute)) {
        return NextResponse.json(
          { error: "Check-in time must be in the future" },
          { status: 400 }
        );
      }
    } 
    // If the date is before today (which shouldn't happen due to front-end filtering)
    else if (checkinDay < today) {
      return NextResponse.json(
        { error: "Check-in date must be in the future" },
        { status: 400 }
      );
    }

    if (checkout <= checkin) {
      return NextResponse.json(
        { error: "Check-out must be after check-in" },
        { status: 400 }
      );
    }

    // Check for 5-day maximum stay
    const daysDiff = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 5) {
      return NextResponse.json(
        { error: "Maximum stay is 5 days" },
        { status: 400 }
      );
    }

    // Check if employee already has an overlapping booking at ANY property
    const employeeBookingConflictQuery = `
      SELECT COUNT(*) as conflict_count
      FROM house_booking
      WHERE employee_id = $1
        AND status = 'Approved'
        AND (
          -- Check for any overlap between the requested booking period and existing bookings
          (
            -- New booking starts before existing booking ends AND new booking ends after existing booking starts
            ($2::timestamp < (checkout_date || ' ' || checkout_time)::timestamp)
            AND 
            ($3::timestamp > (checkin_date || ' ' || checkin_time)::timestamp)
          )
        )
    `;

    const employeeConflictValues = [
      employeeId,
      `${checkinDate} ${checkinTime}`,
      `${checkoutDate} ${checkoutTime}`
    ];

    const employeeConflictResult = await query(employeeBookingConflictQuery, employeeConflictValues);

    if (employeeConflictResult.rows[0].conflict_count > 0) {
      return NextResponse.json(
        {
          error: "You already have a booking at another staff house during this time period. You cannot book multiple properties simultaneously.",
          conflictDetected: true
        },
        { status: 409 }  // 409 Conflict
      );
    }

    // Check for property booking conflicts
    const propertyConflictQuery = `
      SELECT COUNT(*) as conflict_count
      FROM house_booking
      WHERE property_name = $1
        AND status = 'Approved'
        AND (
          -- Check for any overlap between the requested booking period and existing bookings
          (
            -- New booking starts before existing booking ends AND new booking ends after existing booking starts
            ($2::timestamp < (checkout_date || ' ' || checkout_time)::timestamp)
            AND 
            ($3::timestamp > (checkin_date || ' ' || checkin_time)::timestamp)
          )
          
          -- Check for 3-hour cleaning buffer
          OR (
            -- If the requested check-in is on the same day as another booking's checkout
            checkin_date::date = $4::date
            AND (
              -- Check if requested check-in time is within 3 hours after an existing checkout
              ($5::time > checkout_time::time)
              AND
              ($5::time < (checkout_time::time + INTERVAL '3 hours'))
            )
          )
        )
    `;

    const propertyConflictValues = [
      propertyName,
      `${checkinDate} ${checkinTime}`,
      `${checkoutDate} ${checkoutTime}`,
      checkinDate,
      checkinTime
    ];

    const propertyConflictResult = await query(propertyConflictQuery, propertyConflictValues);

    if (propertyConflictResult.rows[0].conflict_count > 0) {
      return NextResponse.json(
        {
          error: "Sorry, this property is unavailable at the specified time. It might be already booked or within the 3-hour cleaning period after a previous checkout.",
          conflictDetected: true
        },
        { status: 409 }  // 409 Conflict
      );
    }

    // Insert into database
    const insertQuery = `
      INSERT INTO house_booking (
        employee_id,
        first_name,
        last_name,
        position,
        department,
        property_name,
        property_location,
        nature_of_stay,
        reason_for_use,
        checkin_date,
        checkin_time,
        checkout_date,
        checkout_time,
        number_of_guests,
        status,
        current_approval_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Pending', 1)
      RETURNING id, submitted_at
    `;

    const values = [
      employeeId,
      firstName,
      lastName,
      position,
      department,
      propertyName,
      propertyLocation,
      natureOfStay,
      reasonForUse,
      checkinDate,
      checkinTime,
      checkoutDate,
      checkoutTime,
      parseInt(numberOfGuests)
    ];

    const result = await query(insertQuery, values);
    const bookingId = result.rows[0].id;

    // Create notification for approvers
    await createApproverNotification({
      requestType: 'house-booking',
      requestId: bookingId,
      approvalLevel: 1
    });

    return NextResponse.json({
      success: true,
      message: "House booking request submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error submitting house booking:", error);
    return NextResponse.json(
      { error: "Failed to submit house booking request" },
      { status: 500 }
    );
  }
}