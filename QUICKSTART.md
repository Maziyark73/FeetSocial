# FeetSocial Quick Start Guide

Get FeetSocial up and running in minutes!

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp env.example .env.local
```

Fill in your API keys (see DEPLOYMENT.md for details on getting these).

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL to create all tables and functions

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## 🎯 What You Can Do

### As a User:
- ✅ Register and login
- ✅ Browse the infinite scroll feed
- ✅ View creator profiles
- ✅ Follow/unfollow users
- ✅ Like posts
- ✅ Tip creators
- ✅ Unlock premium content

### As a Creator:
- ✅ Upload images and videos
- ✅ Create premium vault content
- ✅ Set custom prices
- ✅ Receive tips from fans
- ✅ Track earnings

### As an Admin:
- ✅ Monitor user activity
- ✅ View payment transactions
- ✅ Manage content (minimal moderation)
- ✅ Track platform metrics

## 🔧 Key Features

### Media Handling
- **Images**: Direct upload with UploadThing
- **Videos**: Automatic processing with Mux
- **Transcoding**: Multiple quality levels
- **Streaming**: Optimized playback

### Payments
- **Tips**: Direct creator support
- **Vault Content**: Pay-per-view premium content
- **Stripe Connect**: Secure payment processing
- **Platform Fee**: 10% commission

### Social Features
- **Infinite Scroll**: Smooth browsing experience
- **Real-time Updates**: Live like/follow counts
- **User Profiles**: Rich creator profiles
- **Content Discovery**: Tag-based search

## 🛠 Development

### Project Structure
```
FeetSocial/
├── pages/           # Next.js pages
├── components/      # Reusable components
├── lib/            # API integrations
├── types/          # TypeScript definitions
├── utils/          # Helper functions
└── styles/         # Global styles
```

### Key Files
- `pages/index.tsx` - Main feed
- `pages/upload.tsx` - Content upload
- `pages/profile/[id].tsx` - User profiles
- `lib/supabase.ts` - Database operations
- `lib/stripe.ts` - Payment processing
- `lib/mux.ts` - Video handling

### Adding Features
1. Create components in `/components`
2. Add API routes in `/pages/api`
3. Update types in `/types/index.ts`
4. Add database functions in Supabase

## 🚨 Troubleshooting

### Common Issues

**"Unauthorized" errors**
- Check your Supabase keys
- Verify RLS policies are set up

**Upload failures**
- Check UploadThing configuration
- Verify file size limits

**Payment issues**
- Ensure Stripe keys are correct
- Check webhook endpoints

**Video processing errors**
- Verify Mux credentials
- Check webhook configuration

### Getting Help

1. Check the browser console for errors
2. Review server logs
3. Verify environment variables
4. Test API endpoints individually

## 📈 Next Steps

1. **Customize Branding**: Update colors, logos, and copy
2. **Add Features**: Comments, DMs, notifications
3. **Optimize Performance**: Caching, CDN, lazy loading
4. **Scale Infrastructure**: Database optimization, load balancing
5. **Monetize Further**: Subscriptions, advertising, premium features

## 🎉 You're Ready!

Your FeetSocial platform is now running! Start by creating a user account and uploading some content to test the full flow.

Happy coding! 🚀

