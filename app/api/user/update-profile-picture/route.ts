import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadFile } from "../../../utils/file-upload";
import { query } from "../../../utils/database";

export async function POST(req: NextRequest) {
  try {
    // Get the logged-in user's employee_id from cookies
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('employee_id')?.value;
    
    // If no employee_id in cookies, return unauthorized
    if (!employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }
    
    // Process the form data
    const formData = await req.formData();
    const profilePicture = formData.get('profilePicture');
    const employeeIdFromForm = formData.get('employeeId');
    
    // Validate the file
    if (!profilePicture || typeof profilePicture === 'string') {
      return NextResponse.json(
        { error: "No file uploaded or invalid file" },
        { status: 400 }
      );
    }
    
    // Verify the employee ID matches the cookie
    if (employeeIdFromForm !== employeeId) {
      return NextResponse.json(
        { error: "Unauthorized - Employee ID mismatch" },
        { status: 401 }
      );
    }
    
    // Create a timestamp-based filename
    const timestamp = Date.now();
    const fileExtension = profilePicture.name.split('.').pop();
    const fileName = `profile-pictures/${employeeId}/profile_${timestamp}.${fileExtension}`;
    
    // Upload the file to Vercel Blob
    const buffer = Buffer.from(await profilePicture.arrayBuffer());
    const uploadResult = await uploadFile(buffer, fileName);
    
    // Update the database with the new profile picture URL
    const updateQuery = `
      UPDATE employees
      SET 
        profile_picture = $1,
        updated_at = NOW()
      WHERE employee_id = $2 AND is_active = true
      RETURNING profile_picture
    `;
    
    const result = await query(updateQuery, [uploadResult.url, employeeId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to update profile picture" },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      profile_picture_url: uploadResult.url,
      message: "Profile picture updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return NextResponse.json(
      { error: "Failed to update profile picture" },
      { status: 500 }
    );
  }
}