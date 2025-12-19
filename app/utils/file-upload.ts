// utils/file-upload.ts
import { put, del, list } from '@vercel/blob';

// Simple implementation without complex type annotations
export async function uploadFile(file: Buffer, fileName: string) {
  try {
    const blob = await put(fileName, file, {
      access: 'public',  // Default to public access
    });
    
    return {
      success: true,
      url: blob.url,
    };
  } catch (error: any) {
    console.error('Error uploading file to Vercel Blob:', error);
    throw error;
  }
}

export async function deleteFile(url: string) {
  try {
    await del(url);
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting file from Vercel Blob:', error);
    throw error;
  }
}

export async function listFiles(prefix?: string) {
  try {
    const { blobs } = await list({ prefix });
    return {
      success: true,
      files: blobs,
    };
  } catch (error: any) {
    console.error('Error listing files from Vercel Blob:', error);
    throw error;
  }
}