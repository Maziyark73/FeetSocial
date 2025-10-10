import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB chunks
    });

    const [fields, files] = await form.parse(req);
    
    const streamId = Array.isArray(fields.streamId) ? fields.streamId[0] : fields.streamId;
    const streamKey = Array.isArray(fields.streamKey) ? fields.streamKey[0] : fields.streamKey;
    const timestamp = Array.isArray(fields.timestamp) ? fields.timestamp[0] : fields.timestamp;
    const chunkFile = Array.isArray(files.chunk) ? files.chunk[0] : files.chunk;

    if (!streamId || !streamKey || !chunkFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify stream exists and is active
    const { data: stream, error: streamError } = await (supabaseAdmin as any)
      .from('live_streams')
      .select('*')
      .eq('id', streamId)
      .eq('mux_stream_key', streamKey)
      .single();

    if (streamError || !stream) {
      return res.status(404).json({ error: 'Stream not found or invalid key' });
    }

    // Read chunk data
    const chunkBuffer = fs.readFileSync(chunkFile.filepath);
    
    // Upload chunk to Supabase Storage
    const chunkFileName = `${streamId}/${timestamp}.webm`;
    const { data: uploadData, error: uploadError } = await (supabaseAdmin as any).storage
      .from('live-chunks')
      .upload(chunkFileName, chunkBuffer, {
        contentType: 'video/webm',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading chunk:', uploadError);
      throw uploadError;
    }

    // Clean up temp file
    fs.unlinkSync(chunkFile.filepath);

    // Update stream's last activity timestamp
    await (supabaseAdmin as any)
      .from('live_streams')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', streamId);

    res.status(200).json({ 
      message: 'Chunk uploaded successfully',
      chunkPath: chunkFileName,
    });

  } catch (error: any) {
    console.error('Error uploading chunk:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload chunk' 
    });
  }
}

