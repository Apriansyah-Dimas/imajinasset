# Trigger New Deployment for Vercel

## 🚨 FORCE TRIGGER NEW DEPLOYMENT

Problem: Vercel still using old deployment without password fixes
Solution: Trigger new deployment with latest code

## 📋 Environment Variables Checklist

Verify these are set in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
Value: https://yqxfxchlfuzzgwdcldfy.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGZ4Y2hsZnV6emd3ZGNsZGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkzMTgsImV4cCI6MjA3NzE0NTMxOH0.0Sj2h97hKmsli_IzxxYKmWzHecMNGsvhWpivgCXrhh4

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGZ4Y2hsZnV6emd3ZGNsZGZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU2OTMxOCwiZXhwIjoyMDc3MTQ1MzE4fQ.IDw08usAA3RI02N0485cBCvueqfuEzGWZPT0kTPDyv0

DATABASE_URL
Value: postgresql://postgres:Y7bslYdEX5GrB5Wf@db.yqxfxchlfuzzgwdcldfy.supabase.co:5432/postgres

JWT_SECRET
Value: s+YN1m7zC831NQOdO/gJrDYh+NUyMIxIWYcisaSstDwRUfYBBjpeESCHmL221Q3qiDpSpGSA+J2eq3pgKeSHfw==
```

## 🔧 Action Required

### Option 1: Manual Redeploy (Recommended)
1. Go to Vercel Dashboard → AssetSO project
2. Click "Deployments" tab
3. Click "Redeploy" on latest deployment
4. Wait 2-5 minutes for completion

### Option 2: Small Code Change
1. Add comment to any file (README.md)
2. Commit and push to trigger deployment
3. Vercel will auto-deploy

## 🧪 Test After Deployment

1. Login: admin@assetso.com / admin123
2. Expected: ✅ Login successful, dashboard loads
3. Test /api/auth/me/ - should return user data
4. Check console for "Invalid or expired token" error

## 🎯 Expected Fix

Local working: ✅ POST /api/auth/login/ 200 OK, token valid
Vercel expected: ✅ Same behavior after deployment

The "Invalid or expired token" error should be resolved with new deployment.