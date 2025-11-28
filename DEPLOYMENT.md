# Vercel Deployment Guide

## ⚠️ Important: Database Migration Required

Your app currently uses **SQLite**, which doesn't work with Vercel's serverless functions (read-only file system). You need to migrate to a serverless-compatible database.

## Option 1: Vercel Postgres (Recommended - Easiest)

### Step 1: Set up Vercel Postgres

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Create a new project or select your existing project
3. Go to the **Storage** tab
4. Click **Create Database** → Select **Postgres**
5. Choose a name and region, then click **Create**
6. Copy the connection string (it will be in the format: `postgresql://...`)

### Step 2: Update Prisma Schema

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 3: Create Migration

Run these commands locally:

```bash
# Install PostgreSQL client (if needed)
# On Windows: Download from https://www.postgresql.org/download/windows/
# Or use Docker, or install via package manager

# Update Prisma client
npx prisma generate

# Create a new migration for PostgreSQL
npx prisma migrate dev --name migrate_to_postgres
```

### Step 4: Set Environment Variables in Vercel

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add `DATABASE_URL` with your Postgres connection string
3. Make sure it's available for **Production**, **Preview**, and **Development**

### Step 5: Deploy

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in Vercel
3. Vercel will automatically detect Next.js and deploy
4. After deployment, run migrations:

```bash
# In Vercel dashboard, go to your deployment → Functions → Open terminal
# Or use Vercel CLI:
npx vercel env pull .env.local
npx prisma migrate deploy
```

Or add a build script to run migrations automatically (see below).

---

## Option 2: Other PostgreSQL Providers

### Supabase (Free tier available)

1. Sign up at https://supabase.com
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the connection string
5. Follow Steps 2-5 from Option 1 above

### PlanetScale (MySQL, serverless)

1. Sign up at https://planetscale.com
2. Create a database
3. Get connection string
4. Update Prisma schema to use `mysql` provider
5. Follow similar migration steps

---

## Automated Migration Script

Add this to your `package.json` to run migrations during build:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```

**Note:** This requires Prisma migrations to be committed to your repo.

---

## Quick Deployment Steps (After Database Setup)

### 1. Prepare Your Code

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for deployment"
```

### 2. Install Vercel CLI (Optional but Recommended)

```bash
npm i -g vercel
```

### 3. Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### 4. Or Deploy via GitHub Integration

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Add environment variables in the dashboard
6. Click **Deploy**

---

## Environment Variables Checklist

Make sure these are set in Vercel:

- ✅ `DATABASE_URL` - Your PostgreSQL connection string

---

## Post-Deployment

1. **Run migrations** (if not automated):
   ```bash
   npx prisma migrate deploy
   ```

2. **Verify deployment**:
   - Check your Vercel deployment URL
   - Test creating a goal
   - Test adding subjects/topics
   - Test study sessions

3. **Monitor logs**:
   - Vercel Dashboard → Your Project → Logs
   - Check for any database connection errors

---

## Troubleshooting

### Database Connection Errors

- Verify `DATABASE_URL` is set correctly in Vercel
- Check that your database allows connections from Vercel IPs
- For Vercel Postgres, this is automatic
- For other providers, you may need to whitelist IPs

### Migration Errors

- Make sure migrations are committed to your repo
- Run `npx prisma migrate deploy` manually if needed
- Check Prisma migration status: `npx prisma migrate status`

### Build Errors

- Check that `postinstall` script runs `prisma generate`
- Verify all dependencies are in `package.json`
- Check build logs in Vercel dashboard

---

## Recommended: Add vercel.json (Optional)

Create `vercel.json` for additional configuration:

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "installCommand": "npm install"
}
```

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres

