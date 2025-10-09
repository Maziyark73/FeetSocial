-- Add parent_id column to comments table for nested replies
ALTER TABLE comments 
ADD COLUMN parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Create index for faster nested comment queries
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_post_parent ON comments(post_id, parent_id);

-- Update RLS policies to handle nested comments (already covered by existing policies)
-- Comments are visible to all, and users can only insert/update/delete their own comments

