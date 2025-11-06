# 🏢 AssetSO - Sistem Manajemen Aset Perusahaan

Aplikasi web modern untuk manajemen aset perusahaan yang lengkap dengan fitur Stock Opname (SO), maintenance tracking, dan sistem backup & restore yang komprehensif.

## ✨ Fitur Utama

### 📦 Manajemen Aset Lengkap
- **📋 Data Aset Komprehensif** - Kelola informasi lengkap aset (nomor, nama, kategori, lokasi, dll)
- **🏷️ Kategorisasi Aset** - Organisir aset berdasarkan kategori, departemen, dan lokasi
- **👤 Manajemen PIC** - Tentukan Person In Charge untuk setiap aset
- **📊 Tracking Status** - Monitor status aset (Active, Broken, Lost/Missing, dll)
- **📸 Upload Gambar** - Dokumentasi aset dengan foto
- **🔄 Import/Export** - Import data aset dari CSV/Excel dan export ke berbagai format

### 🔍 Stock Opname (SO) Digital
- **📱 Mobile-Friendly Scanning** - Scan aset dengan mudah menggunakan perangkat mobile
- **📊 SO Sessions** - Buat sesi stock opname dengan periode tertentu
- **✅ Real-time Tracking** - Monitor progress scanning secara real-time
- **🔍 Smart Search** - Cari aset berdasarkan nomor, nama, atau kategori
- **📝 Catatan Scanning** - Tambahkan catatan dan update status saat scanning
- **📈 Progress Dashboard** - Lihat statistik lengkap proses SO

### 🔧 Manajemen Maintenance
- **🛠️ Tiket Maintenance** - Buat dan kelola tiket maintenance untuk aset rusak
- **📋 Broken Assets Tracking** - Pantau aset yang membutuhkan perbaikan
- **⚡ Quick Ticket Creation** - Buat tiket maintenance langsung dari hasil SO
- **📊 Maintenance Reports** - Laporan lengkap aktivitas maintenance
- **👨‍🔧 Teknisi Assignment** - Assign teknisi untuk setiap tiket

### 👥 Manajemen Karyawan
- **👤 Data Karyawan** - Kelola informasi lengkap karyawan
- **🏢 Departemen** - Organisir karyawan berdasarkan departemen
- **📱 Employee Assignments** - Assign karyawan sebagai PIC aset
- **📊 Employee Reports** - Laporan aset yang dimiliki setiap karyawan

### 🏢 Manajemen Lokasi
- **📍 Sites & Locations** - Kelola multiple lokasi/kantor
- **🏢 Site Information** - Detail informasi alamat dan kontak setiap lokasi
- **📊 Location Reports** - Laporan distribusi aset per lokasi

### 🔐 User Management & Security
- **👑 Admin Panel** - Dashboard admin untuk manajemen sistem
- **🔐 Role-Based Access** - Kontrol akses berdasarkan peran (Admin, User, dll)
- **👥 User Accounts** - Kelola akun pengguna dengan permission yang tepat
- **🔒 Secure Authentication** - Sistem autentikasi yang aman

### 💾 Backup & Restore System
- **📦 Complete Backup** - Backup seluruh data aplikasi (Assets, Employees, SO Sessions, Users)
- **🔄 One-Click Restore** - Restore data dengan satu klik ke aplikasi kosong
- **📊 Metadata Tracking** - Informasi lengkap backup (tanggal, versi, jumlah records)
- **🔍 Data Validation** - Validasi data sebelum dan sesudah restore
- **🗂️ Atomic Operations** - Proses restore yang aman dan konsisten
- **📱 Mobile Compatible** - Backup dan restore dari berbagai perangkat

## 🛠️ Teknologi

### 🎯 Framework & Database
- **⚡ Next.js 15** - React framework dengan App Router
- **📘 TypeScript** - Type-safe development
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **🗄️ Supabase** - Modern database dan backend services
- **🔄 Prisma** - ORM untuk database operations (fallback)

### 🧩 UI & User Experience
- **🧩 shadcn/ui** - High-quality component library
- **🎯 Lucide React** - Beautiful icon library
- **📱 Responsive Design** - Mobile-first approach
- **🌈 Dark/Light Mode** - Theme switching support
- **✨ Smooth Animations** - Micro-interactions dengan Framer Motion

### 🔧 Backend & API
- **🚀 RESTful APIs** - Well-structured API endpoints
- **📊 Real-time Updates** - Live data synchronization
- **🔍 Advanced Filtering** - Search dan filter capabilities
- **📈 Pagination** - Efficient data pagination
- **✅ Data Validation** - Comprehensive input validation

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local sesuai kebutuhan; default kami gunakan SQLite dengan DATABASE_URL="file:./dev.db"

# Setup database
npm run db:push
npm run db:seed

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Buka [http://localhost:3000](http://localhost:3000) untuk mengakses aplikasi.

## 📁 Struktur Projek

```
src/
├── app/                      # Next.js App Router pages
│   ├── admin/               # Admin panel pages
│   ├── assets/              # Asset management pages
│   ├── maintenance/         # Maintenance module
│   ├── so-asset/            # Stock Opname pages
│   ├── scan/                # Mobile scanning interface
│   └── api/                 # API routes
│       ├── assets/          # Asset APIs
│       ├── backup/          # Backup & Restore APIs
│       ├── maintenance/     # Maintenance APIs
│       ├── so-sessions/     # Stock Opname APIs
│       └── ...
├── components/              # Reusable React components
│   ├── ui/                 # shadcn/ui components
│   ├── assets.tsx          # Asset components
│   ├── backup-manager-panel.tsx  # Backup UI
│   └── ...
├── lib/                     # Utility functions
│   ├── db.ts               # Database configuration
│   └── ...
└── hooks/                   # Custom React hooks
```

## 🎯 Fitur-Fitur Unggulan

### 📱 Mobile Stock Opname
- **QR Code/Barcode Ready** - Infrastructure siap untuk QR code scanning
- **Offline Mode** - Tetap bisa scanning tanpa internet
- **Batch Processing** - Scan multiple assets sekaligus
- **GPS Location** - Track lokasi scanning (opsional)

### 📊 Advanced Analytics
- **Asset Depreciation** - Kalkulasi penyusutan aset
- **Utilization Reports** - Laporan penggunaan aset
- **Maintenance Analytics** - Analisis kebutuhan maintenance
- **SO Compliance** - Tracking kepatuhan stock opname

### 🔒 Enterprise Security
- **Audit Trail** - Log semua aktivitas penting
- **Data Encryption** - Enkripsi data sensitif
- **Access Control** - Kontrol akses granular
- **Session Management** - Secure session handling

### 🚀 Performance Optimization
- **Lazy Loading** - Optimasi loading data
- **Caching Strategy** - Smart caching untuk performance
- **Database Indexing** - Optimasi query database
- **Image Optimization** - Otomatis optimasi gambar

## 🤝 Support & Deployment

### 🌐 Production Deployment
- **Vercel Ready** - Deploy ke Vercel dengan satu klik
- **Docker Support** - Containerized deployment
- **Environment Config** - Flexible environment setup
- **Database Migration** - Smooth database updates

### 📚 Documentation
- **API Documentation** - Complete API reference
- **User Guides** - Panduan penggunaan fitur
- **Admin Guide** - Manual untuk administrator
- **Troubleshooting** - Common issues dan solutions

## 🔄 Update & Maintenance

### 📦 Regular Updates
- **Security Patches** - Update keamanan reguler
- **Feature Updates** - Penambahan fitur baru
- **Performance Improvements** - Optimasi performa
- **Bug Fixes** - Perbaikan bugs

### 🛠️ Backup Strategy
- **Automated Backup** - Schedule backup otomatis
- **Multiple Storage** - Backup ke multiple locations
- **Data Integrity** - Validasi backup data
- **Restore Testing** - Test restore regularly

---

🏢 **AssetSO** - Solusi lengkap untuk manajemen aset perusahaan modern.

*Built dengan ❤️ menggunakan teknologi terkini untuk efisiensi bisnis Anda.*
