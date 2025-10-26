# Comments Feature Documentation

## Overview
The FeetSocial platform now has a fully implemented comments feature that allows users to comment on posts and reply to other comments (nested/threaded comments).

## Database Schema

### Comments Table
The `comments` table has the following structure:

```sql
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `id` - UUID primary key, auto-generated
- `user_id` - Foreign key referencing the user who created the comment
- `post_id` - Foreign key referencing the post being commented on
- `content` - The comment text content (required)
- `parent_id` - References another comment for nested replies (NULL for top-level comments)
- `created_at` - Timestamp when comment was created
- `updated_at` - Timestamp when comment was last updated (auto-updated via trigger)

### Indexes
The following indexes are created for performance:
- `idx_comments_post` - Fast queries for all comments on a post
- `idx_comments_user` - Fast queries for all comments by a user
- `idx_comments_parent_id` - Fast queries for replies to a comment
- `idx_comments_post_parent` - Composite index for top-level comments
- `idx_comments_created_at` - Fast sorting by creation time

### Row Level Security (RLS)
The comments table has RLS enabled with the following policies:
- **View**: All users can view all comments
- **Insert**: Users can only create comments with their own user_id
- **Update**: Users can only update their own comments
- **Delete**: Users can only delete their own comments

## Database Setup

To set up the comments feature in your Supabase database, run the migration file:

```bash
# In Supabase SQL Editor, run:
/workspace/add-comments-complete.sql
```

Or if you need to add nested comments support to an existing comments table:

```bash
# In Supabase SQL Editor, run:
/workspace/add-nested-comments.sql
```

## TypeScript Types

### Comment Interface
```typescript
export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at?: string;
  // Joined data
  user?: User;
}
```

The types are defined in:
- `/types/database.ts` - Supabase database types
- `/types/index.ts` - Application types

## API Endpoints

### POST /api/comments/create
Creates a new comment.

**Request Body:**
```typescript
{
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null; // Optional, for nested replies
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }
  }
}
```

**Error Responses:**
- `400` - Missing required fields or invalid data
- `404` - Post or parent comment not found
- `500` - Internal server error

### GET /api/comments/[postId]
Retrieves all comments for a post with nested structure.

**Query Parameters:**
- `limit` (optional) - Number of comments to return (1-100, default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```typescript
{
  data: Comment[]; // Array of top-level comments with nested replies
  total: number;
  has_more: boolean;
}
```

Each comment in the response includes a `replies` array containing nested comments.

## Frontend Implementation

### FeedItem Component
The main component displaying comments is `/components/FeedItem.tsx`.

**Features:**
- Display comment count badge
- Toggle comments section on/off
- Show top-level comments with nested replies
- Comment form for authenticated users
- Reply functionality with nested comment support
- User avatars and display names
- Timestamps using relative formatting
- Loading states
- Empty state message

### Usage in FeedItem
The component accepts the following props related to comments:

```typescript
interface FeedItemProps {
  post: FeedItemType;
  currentUserId?: string;
  onComment: (postId: string, text: string, parentId?: string | null) => void;
  // ... other props
}
```

### Comment Display
Comments are displayed in the following structure:
```
[Comment Icon] 25 comments

┌─ Top-level Comment
│  ├─ User Avatar
│  ├─ Display Name
│  ├─ Comment Content
│  ├─ Timestamp
│  ├─ Reply Button
│  └─ Nested Replies
│     ├─ Reply 1
│     ├─ Reply 2
│     └─ ...
├─ Top-level Comment 2
└─ ...
```

## Supabase Helper Functions

The `/lib/supabase.ts` file includes helper functions for comment operations:

### createComment()
```typescript
createComment({
  user_id: string,
  post_id: string,
  content: string,
  parent_id?: string | null
})
```

Creates a new comment or reply.

### getPostComments()
```typescript
getPostComments(postId: string, limit?: number)
```

Fetches all comments for a post, including user data.

## Features

### ✅ Core Features
- [x] Create comments on posts
- [x] Display comments beneath posts
- [x] Show comment count
- [x] Nested/threaded comments (replies to comments)
- [x] User authentication required for posting
- [x] User avatars in comments
- [x] Timestamps for comments
- [x] Toggle comments visibility

### ✅ Security
- [x] Row Level Security (RLS) policies
- [x] User authentication for creating comments
- [x] Users can only edit/delete their own comments
- [x] Foreign key constraints
- [x] Cascading deletes

### ✅ Performance
- [x] Database indexes on frequently queried columns
- [x] Efficient nested comment queries
- [x] Pagination support
- [x] Lazy loading of comments

### ✅ User Experience
- [x] Real-time comment count updates
- [x] Inline reply forms
- [x] Smooth animations and transitions
- [x] Mobile-responsive design
- [x] Loading states
- [x] Empty states

## Testing

To test the comments feature:

1. **Ensure database is set up:**
   - Run the migration: `/workspace/add-comments-complete.sql`

2. **Test comment creation:**
   - Navigate to the feed page
   - Click on a post's comment icon
   - Type a comment and click "Post"
   - Verify the comment appears

3. **Test nested replies:**
   - Click "Reply" on an existing comment
   - Type a reply and submit
   - Verify the reply appears nested under the parent comment

4. **Test permissions:**
   - Ensure only authenticated users can post comments
   - Verify users can only edit/delete their own comments

5. **Test API endpoints:**
   ```bash
   # Create a comment
   curl -X POST http://localhost:3000/api/comments/create \
     -H "Content-Type: application/json" \
     -d '{"post_id":"...","user_id":"...","content":"Test comment"}'
   
   # Get comments for a post
   curl http://localhost:3000/api/comments/[post-id]
   ```

## Future Enhancements

Potential features to add:
- [ ] Like/upvote comments
- [ ] Edit comment functionality in UI
- [ ] Delete comment functionality in UI
- [ ] Comment moderation
- [ ] @mention notifications
- [ ] Rich text formatting
- [ ] Image attachments in comments
- [ ] Comment search
- [ ] Sort options (newest, oldest, most liked)
- [ ] Real-time updates using Supabase subscriptions

## Troubleshooting

### Comments not appearing
1. Check database migration has been run
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Verify user is authenticated

### Cannot create comments
1. Ensure user is logged in
2. Check `user_id` matches authenticated user
3. Verify post exists in database
4. Check network requests for error details

### Nested comments not working
1. Ensure `parent_id` column exists in database
2. Run `/workspace/add-nested-comments.sql` migration
3. Verify parent comment exists before creating reply

## Additional Resources

- Database schema: `/workspace/database-schema.sql`
- Types: `/workspace/types/database.ts`, `/workspace/types/index.ts`
- API routes: `/workspace/pages/api/comments/`
- Component: `/workspace/components/FeedItem.tsx`
- Supabase helpers: `/workspace/lib/supabase.ts`
