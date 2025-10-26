import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId } = req.query;
    const { limit = '50', offset = '0' } = req.query;

    if (!postId || typeof postId !== 'string') {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    // Parse pagination parameters
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter' });
    }

    // Verify the post exists
    const { data: post, error: postError } = await (supabase as any)
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Fetch comments with user data
    const { data: comments, error: commentsError } = await (supabase as any)
      .from('comments')
      .select(`
        *,
        user:users(id, username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    // Organize comments into a nested structure
    const commentMap = new Map();
    const topLevelComments = [];

    // First pass: create a map of all comments
    for (const comment of comments || []) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    // Second pass: organize into nested structure
    for (const comment of comments || []) {
      const commentWithReplies = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        topLevelComments.push(commentWithReplies);
      }
    }

    return res.status(200).json({ 
      data: topLevelComments,
      total: comments?.length || 0,
      has_more: (comments?.length || 0) === limitNum
    });
  } catch (error) {
    console.error('Error in get comments handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
