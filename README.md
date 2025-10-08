# FeetSocial - Creator-First Social Platform MVP

A full-stack adult-only social platform built with Next.js 14, featuring creator monetization, media uploads, and video streaming.

## 🚀 Features

- **Creator Registration & Authentication** - Secure login with Supabase Auth
- **Media Upload** - Images and videos via UploadThing with Mux video processing
- **Video Streaming** - High-quality video playback with Mux
- **Monetization** - Creator tipping and paid vault content via Stripe Connect
- **Infinite Scroll Feed** - Smooth browsing experience
- **Profiles & Following** - Creator profiles with follow functionality
- **Admin-Safe Logic** - Free speech platform with minimal content moderation

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (TypeScript), TailwindCSS
- **Backend**: Supabase (Auth, Database, Storage)
- **Media**: UploadThing (uploads), Mux (video processing/streaming)
- **Payments**: Stripe Connect (tipping, vault unlocks)
- **Styling**: TailwindCSS + shadcn/ui components

## 📁 Project Structure

```
FeetSocial/
├── pages/
│   ├── index.tsx              # Main feed with infinite scroll
│   ├── upload.tsx             # Media upload interface
│   ├── login.tsx              # User login
│   ├── register.tsx           # User registration
│   └── profile/
│       └── [id].tsx           # Creator profile pages
├── components/
│   ├── Uploader.tsx           # Media upload component
│   ├── FeedItem.tsx           # Individual post component
│   ├── ProfileCard.tsx        # Creator profile display
│   └── VaultUnlock.tsx        # Paid content unlock interface
├── lib/
│   ├── supabase.ts            # Supabase client configuration
│   ├── stripe.ts              # Stripe integration & checkout sessions
│   └── mux.ts                 # Mux video processing wrapper
├── types/
│   └── index.ts               # TypeScript type definitions
└── utils/
    └── helpers.ts             # Utility functions
```

## 🗄 Database Schema

### Users Table
- `id` (uuid, primary key)
- `email` (text, unique)
- `username` (text, unique)
- `display_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `stripe_account_id` (text, nullable)
- `is_creator` (boolean, default false)
- `created_at` (timestamp)

### Posts Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `title` (text)
- `description` (text)
- `tags` (text[])
- `is_vault` (boolean, default false)
- `vault_price` (integer, nullable) // in cents
- `media_type` (text) // 'image' | 'video'
- `mux_asset_id` (text, nullable)
- `playback_url` (text, nullable)
- `image_url` (text, nullable)
- `created_at` (timestamp)

### Payments Table
- `id` (uuid, primary key)
- `from_user_id` (uuid, foreign key)
- `to_user_id` (uuid, foreign key)
- `post_id` (uuid, foreign key, nullable)
- `amount` (integer) // in cents
- `type` (text) // 'tip' | 'vault_unlock'
- `stripe_payment_intent_id` (text)
- `status` (text) // 'pending' | 'completed' | 'failed'
- `created_at` (timestamp)

## 🔑 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
UPLOADTHING_SECRET=your_uploadthing_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
MUX_TOKEN=your_mux_token
MUX_SECRET=your_mux_secret
```

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (already configured)

3. Run the development server:
```bash
npm run dev
```

## 💰 Monetization Flow

1. **Creator Onboarding**: Users become creators via Stripe Connect
2. **Content Creation**: Upload media, set vault prices
3. **Tipping**: Users can tip creators directly
4. **Vault Access**: Users pay to unlock premium content
5. **Revenue Sharing**: Platform takes small percentage, rest goes to creators

## 🎥 Video Processing Flow

1. User uploads video via UploadThing
2. File temporarily stored and sent to Mux
3. Mux processes video and provides playback URLs
4. Metadata stored in Supabase for fast retrieval

## 🔒 Content Moderation

- Adult-only platform with age verification
- No content bans unless illegal
- User-reported content review system
- Creator self-moderation tools

---

Built with ❤️ for creators who want to monetize their content safely and effectively.

