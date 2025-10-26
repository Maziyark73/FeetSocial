import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { post_id, content, parent_id, user_id } = req.body;

    // Validate required fields
    if (!post_id || !content || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: post_id, content, and user_id are required' 
      });
    }

    // Validate content length
    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment content is too long (max 1000 characters)' });
    }

    // Verify the post exists
    const { data: post, error: postError } = await (supabase as any)
      .from('posts')
      .select('id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If parent_id is provided, verify the parent comment exists
    if (parent_id) {
      const { data: parentComment, error: parentError } = await (supabase as any)
        .from('comments')
        .select('id, post_id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      // Verify parent comment belongs to the same post
      if (parentComment.post_id !== post_id) {
        return res.status(400).json({ error: 'Parent comment does not belong to this post' });
      }
    }

    // Create the comment
    const { data: comment, error: commentError } = await (supabase as any)
      .from('comments')
      .insert({
        post_id,
        user_id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(`
        *,
        user:users(id, username, display_name, avatar_url)
      `)
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    return res.status(201).json({ data: comment });
  } catch (error) {
    console.error('Error in create comment handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
