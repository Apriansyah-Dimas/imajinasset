# Product Requirements Document (PRD)

## Asset Management System dengan QR Code Scanning

### 1. Overview

Aplikasi Asset Management System adalah solusi web modern untuk mengelola dan melacak aset perusahaan dengan fitur scanning QR code. Sistem ini dirancang untuk memudahkan proses stock opname (SO) tahunan, pelacakan aset, dan manajemen inventaris perusahaan.

### 2. Tech Stack

#### 2.1 Frontend

- **Framework**: Next.js 14 dengan App Router
- **Bahasa**: TypeScript 5
- **Styling**: Tailwind CSS 3.3
- **UI Components**: shadcn/ui (berbasis Radix UI)
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **State Management**: React Context API
- **Notifications**: Sonner

#### 2.2 Backend

- **Runtime**: Node.js
- **Database**: SQLite dengan Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) dengan bcryptjs
- **API**: RESTful API dengan Next.js API Routes
- **File Upload**: Multer untuk upload gambar

#### 2.3 Deployment & Infrastructure

- **Containerization**: Docker dengan Docker Compose
- **Deployment**: Support untuk Railway, Render, dan Vercel
- **Database**: SQLite (development), dapat diupgrade ke PostgreSQL untuk production

### 3. Fitur-Fitur Utama

#### 3.1 Manajemen Pengguna & Autentikasi

- **Login & Logout**: Sistem autentikasi yang aman dengan JWT
- **Registrasi Pengguna**: Pendaftaran pengguna baru dengan validasi
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Akses penuh ke semua fitur
  - **SO Asset User**: Akses ke fitur stock opname dan viewing aset
  - **Viewer**: Akses read-only untuk melihat data aset

#### 3.2 Dashboard

- **Overview Statistik**: Tampilan ringkasan data aset
- **Quick Access**: Akses cepat ke fitur utama
- **Visualisasi Data**: Grafik dan chart untuk analisis
- **Role-Based Content**: Konten yang disesuaikan dengan role pengguna

#### 3.3 Manajemen Aset

- **Registrasi Aset**:

  - Input data aset lengkap (nama, nomor, status, dll)
  - Upload gambar aset
  - Kategorisasi aset
  - Assign PIC (Person in Charge) dari daftar karyawan
  - Custom fields untuk data tambahan

- **Daftar Aset**:

  - Tampilan tabel dan kartu (responsive)
  - Search dan filter multi-kriteria
  - Sorting data
  - Pagination dengan infinite scroll
  - Filter berdasarkan nomor aset dan kategori

- **Edit & Update Aset**:

  - Update informasi aset
  - Perubahan status aset
  - Upload ulang gambar
  - Edit custom fields

- **Bulk Operations**:
  - Import data aset dari CSV
  - Export data aset ke CSV
  - Bulk update aset

#### 3.4 Stock Opname (SO)

- **Sesi Management**:

  - Buat sesi stock opname baru
  - Track progress sesi (scanned vs total assets)
  - Status sesi (Active, Completed, Cancelled)
  - History sesi stock opname

- **QR Code Scanning**:

  - Scan QR code aset dengan kamera device
  - Identifikasi otomatis aset
  - Update status aset saat scanning
  - Handle unidentified assets

- **Asset Tracking**:

  - Identifikasi aset yang sudah di-scan
  - Tracking aset yang hilang/terlewat
  - Update informasi aset saat SO
  - Generate laporan hasil SO

- **Reporting**:
  - Laporan hasil stock opname
  - Daftar aset teridentifikasi
  - Daftar aset tidak teridentifikasi
  - Export laporan ke CSV

#### 3.5 Manajemen Master Data

- **Kategori Aset**: Kelola kategori aset
- **Departemen**: Manajemen data departemen
- **Lokasi/Site**: Kelola lokasi penyimpanan aset
- **Karyawan**: Data karyawan untuk PIC assignment
- **Custom Fields**: Definisi field tambahan untuk aset

#### 3.6 Admin Panel

- **User Management**:

  - Kelola pengguna sistem
  - Assign role dan permissions
  - Aktivasi/deaktivasi user

- **System Management**:

  - Backup database
  - Restore database
  - System settings
  - Health monitoring

- **Reports & Analytics**:
  - Laporan sistem
  - Activity logs
  - Audit trail
  - Analytics dashboard

### 4. Fitur Tambahan

#### 4.1 Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Input Validation**: Validasi data di client dan server
- **SQL Injection Protection**: Prisma ORM
- **XSS Protection**: Sanitization input

#### 4.2 User Experience

- **Responsive Design**: Optimal di desktop, tablet, dan mobile
- **Dark Mode Support**: Tema gelap/terang
- **Loading States**: Skeleton loaders dan spinners
- **Error Handling**: User-friendly error messages
- **Offline Support**: Basic offline functionality

#### 4.3 Performance

- **Optimized Images**: Image compression dan lazy loading
- **Caching**: Client-side caching
- **Code Splitting**: Next.js automatic code splitting
- **Database Optimization**: Indexed queries dengan Prisma

### 5. Data Model

#### 5.1 Core Entities

- **Asset**: Data utama aset perusahaan
- **SOSession**: Sesi stock opname
- **SOAssetEntry**: Entry aset dalam sesi SO
- **User**: Pengguna sistem
- **Employee**: Data karyawan
- **Category**: Kategori aset
- **Department**: Departemen perusahaan
- **Site**: Lokasi penyimpanan aset

#### 5.2 Relationships

- One-to-Many: Asset ke Category, Department, Site, Employee
- Many-to-Many: SOSession ke Asset melalui SOAssetEntry
- One-to-Many: User ke SystemLogs
- Custom Fields: Dynamic fields untuk Asset

### 6. API Endpoints

#### 6.1 Authentication

- `POST /api/auth/login` - Login pengguna
- `POST /api/auth/register` - Registrasi pengguna
- `POST /api/auth/logout` - Logout pengguna
- `GET /api/auth/me` - Get current user

#### 6.2 Assets

- `GET /api/assets` - Get daftar aset
- `POST /api/assets` - Create aset baru
- `GET /api/assets/[id]` - Get detail aset
- `PUT /api/assets/[id]` - Update aset
- `DELETE /api/assets/[id]` - Delete aset
- `GET /api/assets/export` - Export aset ke CSV
- `POST /api/assets/bulk` - Bulk operations

#### 6.3 Stock Opname

- `GET /api/so-sessions` - Get daftar sesi SO
- `POST /api/so-sessions` - Create sesi SO baru
- `GET /api/so-sessions/[id]` - Get detail sesi SO
- `POST /api/so-sessions/[id]/scan` - Scan aset
- `POST /api/so-sessions/[id]/complete` - Complete sesi SO
- `POST /api/so-sessions/[id]/cancel` - Cancel sesi SO

#### 6.4 Admin

- `GET /api/admin/users` - Get daftar pengguna
- `POST /api/admin/users` - Create pengguna baru
- `PUT /api/admin/users/[id]` - Update pengguna
- `DELETE /api/admin/users/[id]` - Delete pengguna
- `POST /api/admin/backup` - Create backup
- `GET /api/admin/logs` - Get system logs

### 7. Deployment

#### 7.1 Development

```bash
npm install
npm run dev
```

#### 7.2 Production

```bash
npm run build
npm start
```

#### 7.3 Docker

```bash
docker-compose up -d
```

#### 7.4 Environment Variables

- `DATABASE_URL`: Connection string database
- `JWT_SECRET`: Secret key untuk JWT
- `NEXTAUTH_SECRET`: Secret untuk NextAuth
- `NEXTAUTH_URL`: URL aplikasi

### 8. Future Enhancements

#### 8.1 Planned Features

- **Mobile App**: Aplikasi mobile native untuk scanning
- **Real-time Updates**: WebSocket untuk real-time collaboration
- **Advanced Analytics**: Business intelligence dashboard
- **API Integration**: Third-party system integration
- **Multi-tenant Support**: Support untuk multiple companies

#### 8.2 Technical Improvements

- **Database Migration**: PostgreSQL untuk production
- **Microservices**: Split services untuk scalability
- **CDN Integration**: Content delivery untuk gambar
- **Advanced Caching**: Redis caching layer
- **Monitoring**: Application performance monitoring

### 9. Conclusion

Asset Management System ini menyediakan solusi komprehensif untuk manajemen aset perusahaan dengan fokus pada kemudahan penggunaan, keamanan, dan skalabilitas. Dengan tech stack modern dan arsitektur yang baik, sistem ini siap untuk digunakan dalam skala enterprise dan dapat dikembangkan lebih lanjut sesuai kebutuhan bisnis.
