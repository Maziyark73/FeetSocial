import { NextApiRequest, NextApiResponse } from 'next';
import { processVideoUpload } from '../../../lib/mux';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileUrl, userId, postId, title, description } = req.body;

    if (!fileUrl || !userId || !postId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process video with Mux
    const result = await processVideoUpload({
      fileUrl,
      userId,
      postId,
      title,
      description,
    });

    return res.status(200).json({ data: result });
  } catch (error: any) {
    console.error('Video processing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process video' });
  }
}

