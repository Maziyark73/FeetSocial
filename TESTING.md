# 🧪 FeetSocial Testing Guide

This guide will help you test all features of FeetSocial locally.

## Prerequisites for Testing

### 1. Supabase Setup (Required)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings > API to get your keys
4. Go to SQL Editor and run the schema from `database-schema.sql`

### 2. Stripe Setup (For Payments)
1. Create a [Stripe account](https://stripe.com) (free)
2. Get your test keys from the dashboard
3. Enable Stripe Connect in your account settings

### 3. UploadThing Setup (For File Uploads)
1. Sign up at [uploadthing.com](https://uploadthing.com)
2. Create a new app and get your API key

### 4. Mux Setup (For Video Processing)
1. Create a [Mux account](https://mux.com) (free tier available)
2. Get your API credentials from the dashboard

## Environment Configuration

Create a `.env.local` file in your project root:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Stripe (For payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# UploadThing (For file uploads)
UPLOADTHING_SECRET=sk_live_...

# Mux (For video processing)
MUX_TOKEN=your_mux_token
MUX_SECRET=your_mux_secret

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Testing Scenarios

### 1. Basic Setup Test
```bash
npm run dev
```
- ✅ App loads at http://localhost:3000
- ✅ No console errors
- ✅ Basic styling works

### 2. Authentication Test
- ✅ User registration works
- ✅ User login works
- ✅ Google OAuth works (if configured)
- ✅ Logout works
- ✅ Protected routes redirect properly

### 3. Database Test
- ✅ User profiles are created
- ✅ Posts can be created
- ✅ Relationships work (follows, likes)
- ✅ Data persists after refresh

### 4. File Upload Test
- ✅ Image uploads work
- ✅ Video uploads work
- ✅ File validation works
- ✅ Upload progress shows

### 5. Social Features Test
- ✅ Feed loads posts
- ✅ Infinite scroll works
- ✅ Like/unlike posts
- ✅ Follow/unfollow users
- ✅ User profiles display correctly

### 6. Payment Test (Stripe Test Mode)
- ✅ Tip payments work
- ✅ Vault unlock payments work
- ✅ Stripe Connect onboarding works
- ✅ Webhooks process correctly

### 7. Video Processing Test
- ✅ Videos upload to Mux
- ✅ Processing status updates
- ✅ Playback URLs work
- ✅ Thumbnails generate

## Quick Test Without Full Setup

If you want to test the UI without setting up all services:

1. **Minimal Setup**: Just add Supabase credentials
2. **Mock Payments**: Skip Stripe setup for now
3. **Local Files**: Skip UploadThing, use local file handling
4. **No Video**: Skip Mux, test images only

## Common Issues & Solutions

### "Supabase connection failed"
- Check your Supabase URL and keys
- Ensure your project is active
- Verify RLS policies are set up

### "Upload failed"
- Check UploadThing configuration
- Verify file size limits
- Check network connectivity

### "Payment error"
- Use Stripe test keys
- Check webhook endpoints
- Verify Stripe Connect is enabled

### "Video processing stuck"
- Check Mux credentials
- Verify webhook configuration
- Check Mux dashboard for errors

## Testing Checklist

- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] App starts without errors
- [ ] User registration works
- [ ] User login works
- [ ] Feed loads posts
- [ ] File upload works
- [ ] Social features work
- [ ] Payments work (test mode)
- [ ] Video processing works

## Performance Testing

- [ ] Page load times < 3 seconds
- [ ] Infinite scroll smooth
- [ ] File uploads fast
- [ ] No memory leaks
- [ ] Mobile responsive

## Security Testing

- [ ] Auth routes protected
- [ ] User data isolated
- [ ] File uploads secure
- [ ] Payments secure
- [ ] No data leaks

## Next Steps After Testing

1. **Fix any issues** found during testing
2. **Optimize performance** if needed
3. **Add additional features** based on feedback
4. **Deploy to production** when ready
5. **Set up monitoring** and analytics

Happy testing! 🚀

