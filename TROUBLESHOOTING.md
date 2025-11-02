# TROUBLESHOOTING.md

## Vercel Deployment Issues & Solutions

### Issue: "Invalid credentials" Error
Setelah mengatur environment variables di Vercel, jika masih mendapat error "Invalid credentials":

#### 1. **Check Environment Variables**
Pastikan semua environment variables terisi dengan benar di Vercel dashboard:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- JWT_SECRET

#### 2. **Verify Supabase Connection**
Test koneksi ke Supabase dengan curl:
```bash
curl -X POST "https://yqxfxchlfuzzgwdcldfy.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@assetso.com","password":"admin123"}'
```

#### 3. **Check Supabase Auth Settings**
- Pastikan Supabase Auth enabled di dashboard
- Verifikasi email confirmation settings
- Check site URL dan redirect URLs

#### 4. **Debug Auth Flow**
Tambahkan console logging di development untuk debugging:
```javascript
// Di AuthContext.tsx
console.log('Environment check:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});
```

#### 5. **Alternative Login Method**
Jika Supabase auth masih bermasalah, gunakan login tanpa Supabase auth:
```javascript
// Temporary fix - gunakan database auth saja
const login = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (response.ok) {
    const data = await response.json();
    setUser(data.user); // Set user tanpa Supabase session
    return true;
  }
  return false;
};
```

### Production URLs
- Local: http://localhost:3000
- Vercel: https://asset-so-six.vercel.app

### Default Login Credentials
- Admin: admin@assetso.com / admin123
- SO Asset: soasset@assetso.com / soasset123
- Viewer: viewer@assetso.com / viewer123