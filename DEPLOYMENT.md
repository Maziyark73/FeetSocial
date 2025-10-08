# FeetSocial Deployment Guide

This guide will help you deploy FeetSocial to production.

## Prerequisites

1. **Supabase Project**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `database-schema.sql` in the SQL editor
   - Get your project URL and API keys

2. **Stripe Account**
   - Create a Stripe account at [stripe.com](https://stripe.com)
   - Enable Stripe Connect in your dashboard
   - Get your API keys and webhook endpoints

3. **Mux Account**
   - Create a Mux account at [mux.com](https://mux.com)
   - Get your API tokens and signing keys

4. **UploadThing Account**
   - Create an account at [uploadthing.com](https://uploadthing.com)
   - Get your API secret

## Environment Variables

Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `UPLOADTHING_SECRET` - Your UploadThing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
- `MUX_TOKEN` - Your Mux token ID
- `MUX_SECRET` - Your Mux secret
- `NEXT_PUBLIC_SITE_URL` - Your production URL

## Database Setup

1. Run the SQL schema in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of database-schema.sql
   ```

2. Enable Row Level Security (RLS) policies as defined in the schema

3. Set up storage buckets in Supabase for media files if needed

## Stripe Webhook Setup

1. In your Stripe dashboard, go to Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook secret to your environment variables

## Mux Webhook Setup

1. In your Mux dashboard, go to Settings > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/mux`
3. Select events:
   - `video.asset.ready`
   - `video.asset.errored`
4. Copy the webhook secret to your environment variables

## Deployment Options

### Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variables in Vercel dashboard

### Netlify

1. Build the project:
   ```bash
   npm run build
   npm run export
   ```

2. Deploy the `out` folder to Netlify

### Docker

1. Create a Dockerfile:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t feetsocial .
   docker run -p 3000:3000 feetsocial
   ```

## Post-Deployment Checklist

- [ ] Database schema is applied
- [ ] Environment variables are set
- [ ] Stripe webhooks are configured
- [ ] Mux webhooks are configured
- [ ] UploadThing is configured
- [ ] SSL certificate is active
- [ ] Domain is pointing to your deployment

## Testing

1. Create a test user account
2. Test file uploads
3. Test Stripe payments (use test mode)
4. Test video processing
5. Test all user flows

## Monitoring

Set up monitoring for:
- Application errors
- Database performance
- Stripe webhook failures
- Mux processing errors
- File upload issues

## Security Considerations

- Use HTTPS in production
- Set up proper CORS policies
- Implement rate limiting
- Monitor for suspicious activity
- Regular security audits
- Keep dependencies updated

## Scaling

For high traffic:
- Use Supabase Pro plan
- Implement CDN for media
- Use Redis for caching
- Consider database read replicas
- Monitor performance metrics

## Support

For issues:
1. Check the logs
2. Verify environment variables
3. Test webhook endpoints
4. Check database connections
5. Review Stripe/Mux dashboard for errors

