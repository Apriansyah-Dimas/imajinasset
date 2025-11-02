# Email Verification System Setup

Sistem Email Verification menggunakan SMTP lokal untuk mengirim email verifikasi kepada pengguna baru.

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
npm install nodemailer @types/nodemailer
```

### 2. SMTP Server Setup (Local)

#### Option A: Using MailHog (Recommended for Development)
```bash
# Install MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# MailHog will:
# - SMTP server: localhost:1025
# - Web Interface: http://localhost:8025
```

#### Option B: Using smtp4dev
```bash
# Install smtp4dev
docker run -d -p 25:25 -p 8080:80 rnwood/smtp4dev

# smtp4dev Web Interface: http://localhost:8080
```

### 3. Environment Configuration

Update `.env` file dengan konfigurasi SMTP:

```env
# Email Configuration (SMTP)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Email From Settings
EMAIL_FROM_NAME="IMAJIN ASSET System"
EMAIL_FROM_ADDRESS=noreply@assetso.com

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 4. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes ke database
npx prisma db push
```

## 📧 How It Works

### 1. User Registration
- User mengisi form registrasi
- System membuat user dengan `emailVerified: false`
- System mengirim email verifikasi dengan token unik
- Token expired dalam 24 jam

### 2. Email Verification
- User klik link di email
- System validasi token
- System update `emailVerified: true`
- User dapat login

### 3. Login Process
- User mencoba login
- System cek `emailVerified` status
- Jika belum verified, user diminta untuk verifikasi
- User dapat request ulang email verifikasi

## 🔧 Configuration Options

### SMTP Providers

#### Gmail (Testing)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
```

#### Mailtrap (Testing)
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
```

## 📱 Email Template

Email verifikasi dikirim dengan template HTML yang responsive:
- Header dengan branding IMAJIN ASSET
- Verification button
- Verification link (copy-paste)
- Security information
- Footer dengan contact info

## 🔒 Security Features

### 1. Token Security
- 64-character random token
- 24-hour expiration
- Single-use token
- Secure token generation

### 2. Rate Limiting
- Max 3 resend requests per day
- IP-based rate limiting
- Email validation

### 3. User Protection
- Email verification required untuk login
- Prevents fake email registration
- Account security enhancement

## 📊 Monitoring & Logs

### Email Logs
```bash
# Check email send logs
tail -f logs/app.log | grep "email"
```

### Database Query
```sql
-- Check unverified users
SELECT email, createdAt, emailVerificationExpires
FROM User
WHERE emailVerified = false;

-- Check verification statistics
SELECT
  COUNT(*) as total_users,
  SUM(emailVerified) as verified_users,
  COUNT(*) - SUM(emailVerified) as unverified_users
FROM User;
```

## 🚀 Testing

### 1. Development Testing
1. Start MailHog: `docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog`
2. Register new user
3. Check MailHog UI: http://localhost:8025
4. Click verification link
5. Test login

### 2. Production Testing
1. Configure real SMTP credentials
2. Test with real email addresses
3. Check email deliverability
4. Test spam filters

## 🔧 Troubleshooting

### Common Issues

#### 1. Email Not Sending
```bash
# Check SMTP configuration
curl telnet://localhost:1025

# Check environment variables
echo $SMTP_HOST
echo $SMTP_PORT
```

#### 2. Token Expired
- Check `emailVerificationExpires` field
- Ensure server timezone is correct
- Verify token generation logic

#### 3. Database Issues
```bash
# Reset verification fields
npx prisma db push --force-reset

# Check user record
npx prisma studio
```

### Debug Mode
```env
# Enable debug logging
DEBUG=email:* npm run dev
```

## 📝 API Endpoints

### Send Verification Email
```http
POST /api/auth/send-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Verify Email
```http
GET /api/auth/verify-email?token=verification-token
```

### Register with Verification
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "role": "VIEWER"
}
```

### Login with Verification Check
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

## 🔄 Flow Diagram

```
User Registration → Create User (unverified) → Send Email → User Clicks Link → Verify Email → Allow Login

Login Attempt → Check Email Verified → If Verified: Login Success → If Not: Show Verification Required
```

## 📱 UI Components

### Registration Form
- Email, name, password fields
- Auto-send verification email
- Show verification message

### Login Form
- Email, password fields
- Show verification error with resend option
- Link to verification page

### Verification Page
- Token validation UI
- Success/error messages
- Resend verification option
- Redirect to login after success

## 🎯 Best Practices

1. **Always use HTTPS** in production
2. **Use real SMTP** for production emails
3. **Monitor email deliverability** rates
4. **Set up domain authentication** (SPF, DKIM, DMARC)
5. **Handle bounced emails** properly
6. **Provide user-friendly error messages**
7. **Test with different email providers**
8. **Keep email templates responsive**