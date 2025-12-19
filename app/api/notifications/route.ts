// app/api/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "../../utils/database";

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

    // Check if table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `;
    const tableCheckResult = await query(checkTableQuery);
    const notificationsTableExists = tableCheckResult.rows[0].exists;

    if (!notificationsTableExists) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0
      });
    }
    
    const sqlQuery = `
      SELECT 
        id,
        type,
        title,
        message,
        reference_id,
        reference_type,
        is_read,
        created_at,
        updated_at
      FROM notifications
      WHERE employee_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await query(sqlQuery, [employeeId]);
    
    const unreadCountQuery = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE employee_id = $1 AND is_read = false
    `;
    
    const countResult = await query(unreadCountQuery, [employeeId]);
    
    // Process notifications to add additional data when needed
    const processedNotifications = await Promise.all(result.rows.map(async (notification) => {
      // For request notifications, add the token number for easier reference
      if (notification.reference_type && notification.reference_id &&
         (notification.type === 'request-approved' || notification.type === 'request-rejected')) {
        
        // Already processed, no additional info needed
        return notification;
      }
      
      return notification;
    }));
    
    return NextResponse.json({
      success: true,
      notifications: processedNotifications,
      unreadCount: parseInt(countResult.rows[0].count)
    });
    
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }
    
    const { notificationId, markAllAsRead } = await req.json();
    
    if (markAllAsRead) {
      // Mark all notifications as read
      const updateQuery = `
        UPDATE notifications
        SET is_read = true
        WHERE employee_id = $1 AND is_read = false
        RETURNING id
      `;
      
      const result = await query(updateQuery, [employeeId]);
      
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
        updatedCount: result.rowCount
      });
    } else if (notificationId) {
      // Mark a specific notification as read
      const updateQuery = `
        UPDATE notifications
        SET is_read = true
        WHERE id = $1 AND employee_id = $2
        RETURNING id
      `;
      
      const result = await query(updateQuery, [notificationId, employeeId]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Notification not found or not authorized to update" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: "Notification marked as read"
      });
    } else {
      return NextResponse.json(
        { error: "Either notificationId or markAllAsRead is required" },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}