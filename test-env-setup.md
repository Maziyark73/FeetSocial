# Environment Setup for Testing

Create a `.env.local` file in your project root with these variables:

```env
# Minimal setup for testing - replace with your actual values
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (Required for basic functionality)
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key_here

# Stripe (Optional for testing - use test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# UploadThing (Optional for testing)
UPLOADTHING_SECRET=your_uploadthing_secret_here

# Mux (Optional for testing)
MUX_TOKEN=your_mux_token_here
MUX_SECRET=your_mux_secret_here
MUX_SIGNING_KEY_ID=your_mux_signing_key_id_here
MUX_SIGNING_KEY_SECRET=your_mux_signing_key_secret_here
MUX_WEBHOOK_SECRET=your_mux_webhook_secret_here
```

## Quick Start Testing (Minimal Setup)

For basic testing, you only need Supabase. Here's how to get started:

### 1. Supabase Setup (5 minutes)
1. Go to [supabase.com](https://supabase.com)
2. Sign up for free
3. Create a new project
4. Go to Settings > API
5. Copy your URL and anon key
6. Go to SQL Editor
7. Copy and paste the contents of `database-schema.sql`
8. Click "Run" to create all tables

### 2. Start Testing
```bash
npm run dev
```

### 3. Test Basic Features
- Open http://localhost:3000
- Try registering a user
- Test the feed (will be empty initially)
- Try uploading content

## Full Testing Setup

For complete feature testing, you'll also need:

### Stripe (Payments)
1. Go to [stripe.com](https://stripe.com)
2. Sign up and get test keys
3. Enable Stripe Connect

### UploadThing (File Uploads)
1. Go to [uploadthing.com](https://uploadthing.com)
2. Create an account and get API key

### Mux (Video Processing)
1. Go to [mux.com](https://mux.com)
2. Create account and get credentials

## Testing Without Full Setup

You can test most features with just Supabase:
- ✅ User authentication
- ✅ Database operations
- ✅ Basic UI/UX
- ✅ Social features
- ❌ File uploads (need UploadThing)
- ❌ Payments (need Stripe)
- ❌ Video processing (need Mux)

