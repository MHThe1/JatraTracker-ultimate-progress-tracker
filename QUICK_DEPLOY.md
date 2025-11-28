# Quick Deploy Checklist

## ⚠️ CRITICAL: You MUST migrate from SQLite to PostgreSQL first!

SQLite will NOT work on Vercel. Follow these steps:

## Step-by-Step (5 minutes)

### 1. Set up Vercel Postgres (2 min)
- Go to https://vercel.com/dashboard
- Create/select project → **Storage** tab
- Click **Create Database** → **Postgres**
- Copy the connection string

### 2. Update Prisma Schema (1 min)
Change `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 3. Create Migration (1 min)
```bash
npx prisma generate
npx prisma migrate dev --name migrate_to_postgres
```

### 4. Deploy to Vercel (1 min)

**Option A: Via GitHub**
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Add `DATABASE_URL` environment variable
5. Deploy

**Option B: Via CLI**
```bash
npm i -g vercel
vercel login
vercel
# Add DATABASE_URL when prompted
vercel --prod
```

### 5. Run Migrations (1 min)
After first deployment:
```bash
npx vercel env pull .env.local
npx prisma migrate deploy
```

Or use Vercel dashboard terminal to run migrations.

---

## That's it! 🎉

Your app should now be live. Check the deployment URL and test it.

---

## Need the full guide?
See `DEPLOYMENT.md` for detailed instructions and troubleshooting.

