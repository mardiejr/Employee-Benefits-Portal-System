import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadFile } from "../../../utils/file-upload";
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
    
    const formData = await req.formData();
    const first_name = formData.get('first_name') as string;
    const middle_name = formData.get('middle_name') as string;
    const last_name = formData.get('last_name') as string;
    const email = formData.get('email') as string;
    const category = formData.get('category') as string;
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const attachment = formData.get('attachment') as File;
    
    if (!first_name || !last_name || !email || !category || !subject || !description || !attachment) {
      return NextResponse.json(
        { error: "All fields including image attachment are required" },
        { status: 400 }
      );
    }

    let attachmentUrl = '';
    if (attachment) {
      console.log("Processing attachment:", attachment.name, "size:", attachment.size);
      
      // Check if file is a valid image
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(attachment.type)) {
        return NextResponse.json(
          { error: "Only image files are allowed (JPEG, PNG, GIF, WebP)" },
          { status: 400 }
        );
      }
      
      try {
        const bytes = await attachment.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Create a safe filename for Vercel Blob
        const fileExt = attachment.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `support/${employeeId}/${Date.now()}.${fileExt}`;
        
        // Upload to Vercel Blob
        const result = await uploadFile(buffer, fileName);
        
        // This is the URL that will be returned from Vercel Blob
        attachmentUrl = result.url;
        console.log("File uploaded to Vercel Blob:", attachmentUrl);
      } catch (fileError) {
        console.error("Error uploading file:", fileError);
        return NextResponse.json(
          { error: "Failed to upload attachment" },
          { status: 500 }
        );
      }
    }
    
    // Insert into database
    const insertQuery = `
      INSERT INTO support_tickets (
        employee_id, first_name, middle_name, last_name, email, category, subject, description, attachment_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;
    
    const result = await query(insertQuery, [
      employeeId, 
      first_name, 
      middle_name || null, 
      last_name, 
      email, 
      category, 
      subject, 
      description, 
      attachmentUrl
    ]);
    
    const ticketId = result.rows[0].id;
    
    return NextResponse.json({
      success: true,
      message: "Support ticket submitted successfully",
      ticketId: ticketId,
      attachmentUrl: attachmentUrl // Return the URL so client can verify
    });
    
  } catch (error) {
    console.error("Error submitting support ticket:", error);
    return NextResponse.json(
      { error: "Failed to submit support ticket", details: String(error) },
      { status: 500 }
    );
  }
}