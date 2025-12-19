// app/api/admin/activity-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool, { query, transaction } from "../../../utils/database";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const employeeCheckQuery = `
      SELECT role_class 
      FROM employees 
      WHERE employee_id = $1 AND is_active = true
    `;
    const employeeCheck = await query(employeeCheckQuery, [employeeId]);

    if (employeeCheck.rows.length === 0 || !employeeCheck.rows[0].role_class.startsWith('Class A')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';
    const user = url.searchParams.get('user') || '';
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Construct base query
    let sqlQuery = `
      SELECT 
        al.id,
        al.user_id,
        CONCAT(e.first_name, ' ', e.last_name, ' (', al.user_id, ')') AS user_name,
        al.action,
        al.module,
        al.details,
        al.status,
        al.created_at AS timestamp
      FROM 
        activity_logs al
      LEFT JOIN 
        employees e ON al.user_id = e.employee_id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (type !== 'all') {
      sqlQuery += ` AND al.action = $${paramIndex}`;
      queryParams.push(type.toUpperCase());
      paramIndex++;
    }

    if (user) {
      sqlQuery += ` AND (
        al.user_id ILIKE $${paramIndex} OR
        e.first_name ILIKE $${paramIndex} OR
        e.last_name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${user}%`);
      paramIndex++;
    }

    if (dateFrom) {
      sqlQuery += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(`${dateFrom} 00:00:00`);
      paramIndex++;
    }

    if (dateTo) {
      sqlQuery += ` AND al.created_at <= $${paramIndex}`;
      queryParams.push(`${dateTo} 23:59:59`);
      paramIndex++;
    }

    // Add order and pagination
    sqlQuery += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM activity_logs al
      LEFT JOIN employees e ON al.user_id = e.employee_id
      WHERE 1=1
    `;
    
    // Add the same filters to count query
    let countParams = [...queryParams];
    countParams.pop(); // Remove limit
    countParams.pop(); // Remove offset
    
    if (type !== 'all') {
      countQuery += ` AND al.action = $1`;
      paramIndex = 2;
    } else {
      paramIndex = 1;
    }

    if (user) {
      countQuery += ` AND (
        al.user_id ILIKE $${paramIndex} OR
        e.first_name ILIKE $${paramIndex} OR
        e.last_name ILIKE $${paramIndex}
      )`;
      paramIndex++;
    }

    if (dateFrom) {
      countQuery += ` AND al.created_at >= $${paramIndex}`;
      paramIndex++;
    }

    if (dateTo) {
      countQuery += ` AND al.created_at <= $${paramIndex}`;
    }

    // Execute both queries
    const [logsResult, countResult] = await Promise.all([
      query(sqlQuery, queryParams),
      query(countQuery, countParams)
    ]);

    // Format the result
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}