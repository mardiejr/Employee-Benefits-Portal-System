// app/api/house-booking/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../utils/database";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const propertyName = url.searchParams.get('propertyName');

  if (!propertyName) {
    return NextResponse.json(
      { error: 'Property name is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch all approved bookings for the property
    const bookedDatesQuery = `
      SELECT 
        checkin_date,
        checkout_date, 
        checkin_time, 
        checkout_time,
        first_name || ' ' || last_name AS booker_name
      FROM 
        house_booking 
      WHERE 
        property_name = $1 
        AND status = 'Approved'
    `;

    const result = await query(bookedDatesQuery, [propertyName]);
    
    return NextResponse.json({
      bookedDates: result.rows
    });
  } catch (error) {
    console.error('Error fetching booking availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking availability' },
      { status: 500 }
    );
  }
}