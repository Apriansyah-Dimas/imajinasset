# Imajin Asset - One-Click Deployment

## 🚀 Quick Start

### Deploy to Localhost + Cloudflare Tunnel
**Single Click Deployment:**
```bash
deploy-imajinasset.bat
```

### Stop All Services
```bash
stop-imajinasset.bat
```

## 📋 What the Deployment Script Does

1. **Cleanup**: Stops existing services
2. **Dependencies**: Checks and installs npm packages
3. **Database**: Sets up SQLite database with seed data
4. **Localhost**: Starts Next.js server on port 3001
5. **Cloudflare Tunnel**: Connects to www.imajinasset.biz.id
6. **Verification**: Confirms all services are running

## 🌐 Access Points

- **Local**: http://localhost:3001
- **Custom Domain**: https://www.imajinasset.biz.id

## 🔑 Default Login

- **Email**: admin@assetso.com
- **Password**: Created during database seeding

## ⚙️ Requirements

- Windows OS
- Node.js installed
- cloudflared.exe in project directory
- config.yml with tunnel configuration
- Valid Cloudflare account with domain imajinasset.biz.id

## 🔧 Manual Commands

If you prefer manual setup:

```bash
# Install dependencies
npm install

# Setup database
DATABASE_URL="file:./dev.db" npx prisma db push
DATABASE_URL="file:./dev.db" npm run db:seed

# Start Next.js (Terminal 1)
PORT=3001 npm run dev

# Start Cloudflare Tunnel (Terminal 2)
cloudflared.exe tunnel --config config.yml run
```

## 🐛 Troubleshooting

### Port Already in Use
The script automatically kills processes on port 3001. If issues persist:
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Cloudflare Tunnel Fails
- Check config.yml is correct
- Verify tunnel exists: `cloudflared.exe tunnel list`
- Ensure domain is pointed correctly in Cloudflare DNS

### Database Issues
- Delete `dev.db` and re-run deployment
- Check Prisma schema: `prisma/schema.prisma`

## 📝 File Structure

```
imajinasset/
├── deploy-imajinasset.bat    # Main deployment script
├── stop-imajinasset.bat      # Stop all services
├── config.yml                # Cloudflare tunnel config
├── cloudflared.exe           # Cloudflare tunnel binary
├── package.json              # Node.js dependencies
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Database seed data
└── dev.db                   # SQLite database (created automatically)
```

## 🔄 Automatic Restart

To restart services:
1. Run `stop-imajinasset.bat`
2. Run `deploy-imajinasset.bat`

Both localhost and custom domain will be available again within 30 seconds.