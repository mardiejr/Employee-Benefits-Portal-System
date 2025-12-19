// app/api/doctors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from "../../utils/database";

export async function GET(req: NextRequest) {
  try {
    // Get URL params
    const url = new URL(req.url);
    const hospitalId = url.searchParams.get('hospitalId');
    const category = url.searchParams.get('category');
    
    // Build the query based on the provided filters
    let queryText = 'SELECT * FROM doctors';
    const queryParams: any[] = [];
    
    if (hospitalId || category) {
      queryText += ' WHERE';
      
      if (hospitalId) {
        queryParams.push(hospitalId);
        queryText += ` hospital_id = $${queryParams.length}`;
      }
      
      if (hospitalId && category) {
        queryText += ' AND';
      }
      
      if (category) {
        queryParams.push(category);
        queryText += ` category = $${queryParams.length}`;
      }
    }
    
    // Order by name
    queryText += ' ORDER BY doctor_name';
    
    console.log('Executing query:', queryText, 'with params:', queryParams);
    
    const result = await query(queryText, queryParams);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
    
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}