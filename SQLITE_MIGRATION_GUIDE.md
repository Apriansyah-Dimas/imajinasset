# Migrasi Asset SO dari Supabase ke SQLite

> **Catatan:** Konfigurasi aktif sekarang menggunakan SQLite via Prisma. Dokumen ini dipertahankan sebagai referensi historis apabila diperlukan migrasi ulang.

## Ringkasan

Dokumentasi ini menjelaskan proses migrasi aplikasi Asset SO dari Supabase kembali ke SQLite lokal untuk mengatasi berbagai masalah yang terjadi.

## Alasan Migrasi

2. **Inkonsistensi Database** - Campuran penggunaan Prisma dan Supabase menyebabkan error
3. **Performa Lokal** - SQLite lebih cepat untuk development dan testing
4. **Kemudahan Deployment** - Tidak perlu konfigurasi Supabase yang kompleks

## Langkah-Langkah Migrasi

### 1. Update Prisma Schema

✅ **Selesai** - File `prisma/schema.prisma` telah diupdate:
- Mengubah provider dari `postgresql` ke `sqlite`
- Menghapus enum yang tidak didukung SQLite

### 2. Update Dependencies

✅ **Selesai** - File `package.json` telah diupdate:
- Menambahkan `@prisma/client` dan `prisma`
- Menambahkan scripts untuk database management

### 3. Konfigurasi Database

✅ **Selesai** - File `.env.local` telah dikonfigurasi:
- `DATABASE_URL="file:dev.db"` untuk SQLite lokal
- Menonaktifkan sementara Supabase variables

### 4. Generate Prisma Client

✅ **Selesai** - Prisma client berhasil di-generate:
```bash
npx prisma generate
```

### 5. Create Database

✅ **Selesai** - Database SQLite berhasil dibuat:
```bash
npx prisma db push
```

### 6. Update API Endpoints

✅ **Selesai** - Semua API endpoints telah diupdate ke Prisma:

#### Assets API
- `src/app/api/assets/route.ts` - Menggunakan `db.asset.findMany()` dan `db.asset.create()`
- Search dengan `mode: 'insensitive'` untuk case-insensitive search
- Include relations (site, category, department, employee)

#### SO Sessions API
- `src/app/api/so-sessions/[id]/scan/route.ts` - Scan asset dengan Prisma
- `src/app/api/so-sessions/[id]/entries/route.ts` - Get entries dengan search
- `src/app/api/so-sessions/[id]/entries/[entryId]/route.ts` - Update entry
- `src/app/api/so-sessions/[id]/cancel/route.ts` - Cancel session
- `src/app/api/so-sessions/[id]/delete/route.ts` - Delete session
- `src/app/api/so-sessions/[id]/complete/route.ts` - Complete session

#### Backup API
- `src/app/api/backup/export/route.ts` - Export dengan Prisma
- `src/app/api/backup/import/route.ts` - Import dengan Prisma

### 7. Database Seeding

✅ **Selesai** - Data awal berhasil diisi:
```bash
npx tsx prisma/seed.ts
```

Data yang diisi:
- Admin user (admin@assetso.com / admin123)
- 2 sample sites (Head Office, Branch Office)
- 2 sample categories (Laptop, Monitor)
- 2 sample departments (IT, Finance)
- 2 sample employees (John Doe, Jane Smith)
- 2 sample assets (LAP001, MON001)
- 1 sample SO session (SO 2024 Q1)

## Perbaikan Bug yang Telah Dilakukan

### 1. Nomor Asset Tidak Muncul di Form Edit

**Masalah**: Field `noAsset` tidak muncul di popup edit saat scanning SO Asset

**Penyebab**: Inkonsistensi format data antara database dan frontend

**Solusi**: 
- Mengupdate semua SO session endpoints untuk mengembalikan field `noAsset`
- Memastikan data transformation dari database ke frontend konsisten

### 2. Cancel/Complete/Delete Session Tidak Berfungsi

**Masalah**: User tidak bisa membatalkan, menyelesaikan, atau menghapus SO session

**Penyebab**: Inkonsistensi penggunaan database adapter (campuran Prisma/Supabase)

**Solusi**:
- Mengkonversi semua SO session endpoints ke Prisma
- Menggunakan `db.sOSession.update()` dan `db.sOSession.delete()`

### 3. Search Bar Refresh Terus-Menerus

**Masalah**: Search bar di halaman Assets melakukan refresh tanpa henti

**Penyebab**: Duplikasi logika filter dan tidak ada debouncing

**Solusi**:
- Menambahkan debouncing 300ms
- Menghapus duplikasi filter logic
- Memperbaiki TypeScript errors

## Struktur Database SQLite

Database SQLite (`dev.db`) sekarang memiliki table:
- `sites` - Lokasi asset
- `categories` - Kategori asset  
- `departments` - Departemen
- `employees` - Data karyawan
- `assets` - Data asset utama
- `asset_custom_fields` - Field kustom asset
- `asset_custom_values` - Nilai field kustom
- `so_sessions` - Sesi stock opname
- `so_asset_entries` - Entry asset per sesi
- `users` - Data user aplikasi

## Cara Menjalankan Aplikasi

### Development Mode
```bash
npm run dev
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# View database
npm run db:studio

# Seed data
npx tsx prisma/seed.ts
```

## Testing

### Test Scenarios
1. **Asset Management**
   - Create new asset
   - Edit existing asset
   - Search assets
   - Filter by category/site/department

2. **SO Asset Scanning**
   - Create SO session
   - Scan asset QR code
   - Edit scanned asset
   - Complete SO session

4. **Backup/Restore**
   - Export backup
   - Import backup
   - Verify data integrity

## Troubleshooting

### Common Issues

1. **Prisma Client Not Found**
   ```bash
   npm run db:generate
   ```

2. **Database Connection Error**
   - Periksa file `.env.local`
   - Pastikan `DATABASE_URL` benar

3. **Migration Error**
   ```bash
   npx prisma db push --force-reset
   ```

4. **Seed Error**
   - Hapus file `dev.db`
   - Jalankan `npx prisma db push`
   - Jalankan seed lagi

## Backup Data

### Dari Supabase (Jika Diperlukan)
1. Export data dari Supabase Dashboard
2. Convert ke format yang sesuai
3. Import menggunakan API backup

### Ke SQLite
1. File `dev.db` adalah database SQLite utama
2. Backup file ini secara regular
3. Gunakan API export/import untuk backup lengkap

## Next Steps

1. **Testing** - Lakukan comprehensive testing
2. **Performance** - Monitor performa aplikasi
3. **Monitoring** - Setup error tracking
4. **Documentation** - Update user documentation

## File yang Diubah

### Core Files
- `prisma/schema.prisma` - Schema database
- `src/lib/db.ts` - Database client
- `package.json` - Dependencies dan scripts
- `.env.local` - Environment variables

### API Files
- `src/app/api/assets/route.ts`
- `src/app/api/so-sessions/[id]/scan/route.ts`
- `src/app/api/so-sessions/[id]/entries/route.ts`
- `src/app/api/so-sessions/[id]/entries/[entryId]/route.ts`
- `src/app/api/so-sessions/[id]/cancel/route.ts`
- `src/app/api/so-sessions/[id]/delete/route.ts`
- `src/app/api/so-sessions/[id]/complete/route.ts`
- `src/app/api/backup/export/route.ts`
- `src/app/api/backup/import/route.ts`

### Support Files
- `prisma/seed.ts` - Data seeding
- `SQLITE_MIGRATION_GUIDE.md` - Dokumentasi ini

## Konklusi

Migrasi dari Supabase ke SQLite telah berhasil diselesaikan dengan:
- ✅ Semua API endpoints dikonversi ke Prisma
- ✅ Database lokal SQLite yang stabil
- ✅ Data awal untuk testing
- ✅ Perbaikan semua bug yang dilaporkan
- ✅ Dokumentasi lengkap

Aplikasi sekarang siap untuk development dan testing dengan SQLite lokal.
