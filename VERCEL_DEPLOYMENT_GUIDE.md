# Vercel Deployment Guide - AssetSO

## 🎯 Prerequisites

1. **Supabase Account** (Free tier)
2. **Vercel Account** (Free tier)
3. **GitHub Repository** (for automatic deployments)

## 📋 Step-by-Step Deployment

### 1. Setup Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Set project name: `assetso-production`
5. Set database password (save it!)
6. Choose region (Singapore recommended)
7. Click "Create new project"

### 2. Get Supabase Credentials

From your Supabase project dashboard:

1. **Project URL**: Settings → API → Project URL
2. **Anon Public Key**: Settings → API → anon public
3. **Service Role Key**: Settings → API → service_role (keep secret!)

### 3. Setup Database Schema

1. Go to Supabase SQL Editor
2. Run this SQL to create tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables matching Prisma schema
-- (Run: npx prisma db push after setting DATABASE_URL)
```

3. Or use Prisma:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" npx prisma db push
   ```

### 4. Configure Environment Variables

Create `.env.local` for local development:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE-ROLE-KEY]"

# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="your-jwt-secret-key-here-assetso-2024"
```

### 5. Import Existing Data

If you have existing data:

```bash
# Export from SQLite (if needed)
npm run export:data

# Set your Supabase credentials in .env
# Then import to Supabase
npm run import:data
```

### 6. Setup Vercel Deployment

#### Option A: GitHub Integration (Recommended)

1. Push code to GitHub
2. Connect Vercel to GitHub
3. Import repository
4. Configure environment variables in Vercel dashboard

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 7. Vercel Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE-ROLE-KEY]"
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
JWT_SECRET="your-jwt-secret-key-here-assetso-2024"
```

### 8. Deploy to Vercel

```bash
# Build and deploy
npm run build
vercel --prod

# Or with GitHub integration, just push to main branch
git push origin main
```

## 🔧 Configuration Files

### `vercel.json` (Already configured)
- ✅ Optimized for Next.js App Router
- ✅ Prisma generation included
- ✅ Function timeout: 30s
- ✅ Region: Singapore (sin1)

### `next.config.ts` (Already configured)
- ✅ Supabase environment variables
- ✅ Webpack fallbacks for serverless
- ✅ Build optimizations

### `prisma/schema.prisma` (Already configured)
- ✅ PostgreSQL provider
- ✅ All tables and relations

## 📊 Free Tier Limits

### Supabase Free Tier
- **Database**: 500MB PostgreSQL
- **Storage**: 1GB file storage
- **Bandwidth**: 2GB/month
- **MAU**: 50,000 users
- **Real-time**: Unlimited connections

### Vercel Free Tier
- **Functions**: 100k requests/day
- **Bandwidth**: 100GB/month
- **Build time**: Unlimited (public repos)
- **Custom domain**: Free

## 🚀 Production Checklist

- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Data imported (if any)
- [ ] Vercel project connected
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring setup

## 🛠️ Troubleshooting

### Common Issues

1. **Build fails with Prisma error**
   ```bash
   # Ensure DATABASE_URL is correct
   # Run: npx prisma generate
   ```

2. **CORS issues**
   - Check Supabase Authentication → Settings → Site URL
   - Add your Vercel domain

3. **Database connection timeout**
   - Check Vercel region matches Supabase region
   - Ensure connection string uses `sslmode=require`

4. **Function timeout**
   - Increase `maxDuration` in vercel.json
   - Optimize database queries

### Support Commands

```bash
# Local development
npm run dev

# Debug build
npm run build

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check logs
vercel logs
```

## 🎉 Post-Deployment

1. **Test all features**
   - User login/logout
   - Asset management
   - File uploads
   - Real-time updates

2. **Monitor performance**
   - Vercel Analytics
   - Supabase Dashboard

3. **Set up alerts** (optional)
   - Vercel error notifications
   - Supabase usage alerts

Your AssetSO application is now running on Vercel with Supabase backend! 🚀