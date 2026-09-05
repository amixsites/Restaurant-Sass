# Deployment Guide

## Overview

| Service | Platform | Purpose |
|---|---|---|
| Frontend | Vercel | React + Vite SPA |
| Database / Auth / Realtime / Storage | Supabase | All backend services |
| Edge Functions | Supabase | Privileged server-side operations |

---

## Prerequisites

- Node.js 18+ installed
- Supabase project created at [supabase.com](https://supabase.com)
- Vercel account at [vercel.com](https://vercel.com)
- Supabase CLI installed: `npm install -g supabase`

---

## Step 1: Supabase Setup

### 1.1 Run the Database Schema

In your Supabase project → SQL Editor, run these files in order:

```
1. supabase/schema.sql          ← Core tables, enums, RLS policies
2. supabase/migrations/phase2_schema.sql  ← Additional columns
3. supabase/create_bucket.sql   ← Storage bucket for menu images
```

### 1.2 Enable Realtime

In Supabase Dashboard → Database → Replication, enable realtime for:
- `orders`
- `order_items`
- `tables`

Or run in SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
```

### 1.3 Deploy Edge Functions

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the manage-users function
supabase functions deploy manage-users
```

### 1.4 Get Your API Keys

In Supabase Dashboard → Project Settings → API:
- Copy `Project URL` → this is `VITE_SUPABASE_URL`
- Copy `anon public` key → this is `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Local Development

```bash
# Clone the repo
git clone <your-repo-url>
cd restaurant-pos

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your Supabase credentials

# Start development server
npm run dev
```

App runs at: http://localhost:5173

---

## Step 3: Deploy to Vercel

### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Framework: Vite (auto-detected)
# - Build command: npm run build
# - Output directory: dist

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

### Option B: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
7. Click **Deploy**

The `vercel.json` in the project root handles:
- SPA routing (all routes → index.html)
- Security headers (X-Frame-Options, XSS protection, etc.)
- Asset caching (1 year for hashed assets)

---

## Step 4: Create the First Super Admin

After deployment, create the first SUPER_ADMIN user manually in Supabase:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → enter email + password
3. Copy the new user's UUID
4. Go to SQL Editor and run:

```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'paste-uuid-here',
  'admin@yourdomain.com',
  'Super Admin',
  'SUPER_ADMIN'
);
```

5. Log in at your Vercel URL with those credentials

---

## Step 5: Create First Restaurant

1. Log in as SUPER_ADMIN
2. Navigate to `/super-admin/create`
3. Fill in restaurant details
4. The system creates the restaurant + subscription record

---

## Production Checklist

- [ ] Supabase schema deployed (schema.sql + phase2_schema.sql)
- [ ] Realtime enabled for orders, order_items, tables
- [ ] Storage bucket `menu-images` created with public access
- [ ] Edge function `manage-users` deployed
- [ ] Environment variables set in Vercel
- [ ] `.env` file is NOT committed to git
- [ ] `credentials.txt` removed from repo
- [ ] First SUPER_ADMIN user created in Supabase
- [ ] Custom domain configured in Vercel (optional)
- [ ] Supabase project is on a paid plan for production (free tier has limits)

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `FRONTEND_URL` | Yes | Frontend URL allowed by backend CORS and redirect flow |
| `SECRET_KEY` | Recommended | Backend secret for signing/authentication in production |
| `QR_BASE_URL` | No | Backend URL used for QR landing links |
| `VITE_WHATSAPP_PHONE_NUMBER_ID` | No | Meta WhatsApp Cloud API phone number ID |
| `VITE_WHATSAPP_ACCESS_TOKEN` | No | Meta WhatsApp Cloud API access token |

---

## QR Code Menu URLs

Customer-facing menu URLs follow this pattern:
```
https://your-domain.com/m/{restaurantId}/{tableId}
```

Generate QR codes pointing to these URLs for each table. The `restaurantId` and `tableId` are UUIDs from the Supabase `restaurants` and `tables` tables.

---

## Monitoring & Maintenance

- **Supabase Dashboard** → Logs → API logs for database query monitoring
- **Vercel Dashboard** → Functions → Runtime logs for deployment issues
- **Supabase Dashboard** → Database → Query Performance for slow query detection
- Browser DevTools → Console for frontend errors (errors always log even in production)
