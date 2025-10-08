import { NextApiRequest, NextApiResponse } from 'next';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

const f = createUploadthing();

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      // Check authentication
      const supabase = createServerSupabaseClient({ req, res: res as any });
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error('Unauthorized');
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Image upload complete for userId:', metadata.userId);
      console.log('File URL:', file.url);
      
      return { uploadedBy: metadata.userId };
    }),

  videoUploader: f({ video: { maxFileSize: '500MB', maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      // Check authentication
      const supabase = createServerSupabaseClient({ req, res: res as any });
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error('Unauthorized');
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Video upload complete for userId:', metadata.userId);
      console.log('File URL:', file.url);
      
      return { uploadedBy: metadata.userId };
    }),

  mediaUploader: f({ 
    image: { maxFileSize: '4MB', maxFileCount: 1 },
    video: { maxFileSize: '500MB', maxFileCount: 1 }
  })
    .middleware(async ({ req }) => {
      // Check authentication
      const supabase = createServerSupabaseClient({ req, res: res as any });
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error('Unauthorized');
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Media upload complete for userId:', metadata.userId);
      console.log('File URL:', file.url);
      
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;

// Simple handler for basic uploads without UploadThing's full setup
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This is a simplified version - in production, you'd use UploadThing's proper setup
    // For now, we'll return an error directing users to use the proper UploadThing integration
    return res.status(501).json({ 
      error: 'UploadThing integration not fully configured',
      message: 'Please configure UploadThing according to their documentation'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

