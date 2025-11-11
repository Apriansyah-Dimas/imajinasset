# Sneat-Style UI Kit (Putih & Ungu)

Panduan ini merombak total gaya visual aplikasi mengikuti nuansa Sneat, tetapi dengan warna utama khusus (#6365B9). Semua komponen dibuat flat, modern, dan menjaga fungsionalitas yang telah ada.

## 1. Palet Warna

| Token | Hex | Deskripsi | Contoh Pemakaian |
| --- | --- | --- | --- |
| `--primary` | `#6365B9` | Aksen utama, action, highlight | Tombol utama, ikon aktif, grafik |
| `--secondary` | `#EBE9FF` | Permukaan sekunder yang lembut | Header tabel, badge status |
| `--accent` | `#8F92FF` | Aksen pelengkap | Grafik, badge info, chip |
| `--surface` | `#FFFFFF` | Dasar kartu/panel | Card, modal, input |
| `--surface-muted` | `#F1F2FF` | Background lembut/global | Body, section background |
| `--background` | `#F5F6FB` | Warna kanvas aplikasi | Area konten utama |
| `--foreground` | `#1F2041` | Warna teks utama | Heading & body text |
| `--text-muted` | `#6F7297` | Teks sekunder | Label, helper text |
| `--border` | `#DFE2FF` | Border lembut | Card, tabel, input |
| `--success` | `#32C997` | Status sukses | Badge, alert |
| `--warning` | `#FFB547` | Status peringatan | Badge, alert |
| `--destructive` | `#F97066` | Status bahaya | Tombol hapus, alert error |

## 2. Style Guideline

- **Font**: Public Sans (`--font-public-sans`) dengan berat 400/500/600. Body 14–16px, heading 24–40px dengan letter-spacing negatif tipis.
- **Radius**: XS 8px, SM 12px, MD 18px (`--radius`), LG 24px untuk kartu spesial.
- **Spacing**: Gunakan skala 8 (8, 12, 16, 24, 32px). Untuk layout, pakai `space-y-6`, `gap-6`, `pt-8`, `px-6 lg:px-10`.
- **Shadow**:
  - Soft: `var(--shadow-soft)` → default card/panel.
  - Medium: `var(--shadow-medium)` → hover card.
  - Strong: `var(--shadow-strong)` → modal/floating CTA.
- **Navbar & Sidebar**: Flat putih dengan border lembut (`border-border`) dan shadow tipis. Tidak ada gradient.
- **Card & Panel**: `surface-card`/`surface-panel`, gunakan padding lapang (24–32px) dan gap antar elemen >16px.
- **Form/Input**: `sneat-input` + `focus:ring` halus; gunakan `grid gap-5` agar bernafas.
- **Iconografi**: Gunakan lucide dengan ukuran konsisten (`size-4`/`size-5`), warna `text-primary` bila aktif.

## 3. Kelas Utility yang Disiapkan

| Kelas | Fungsi |
| --- | --- |
| `.surface-card` | Card utama dengan radius 18px, border lembut, shadow halus |
| `.surface-panel` | Panel besar (filter, summary) dengan padding 32px |
| `.sneat-nav` | Navbar flat dengan shadow lembut |
| `.sneat-sidebar` | Sidebar putih dengan border kanan & shadow |
| `.sneat-table` | Kerangka tabel (thead uppercase, hover subtle) |
| `.sneat-input` | Input/form-control modern |
| `.sneat-btn`, `.sneat-btn-primary`, `.sneat-btn-soft`, `.sneat-btn-outlined` | Variant tombol konsisten |
| `.dashboard-grid` | Grid responsif auto-fit kartu |
| `.dashboard-layout` | Layout 2 kolom: sidebar konten + konten utama |
| `.sneat-chip`, `.gradient-text` | Badge/typography aksen |

Contoh Tailwind utility tambahan yang sejalan: `max-w-7xl mx-auto space-y-6`, `grid gap-6`, `rounded-[18px]`, `shadow-[var(--shadow-soft)]`, `text-[#1F2041]`, `bg-[#F5F6FB]`, `text-sm tracking-[0.08em] uppercase`.

## 4. Contoh Komponen

### Sidebar

```tsx
"use client";
import { LayoutDashboard, Package, Users } from "lucide-react";
import Link from "next/link";

export function AppSidebar() {
  const nav = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Assets", href: "/assets", icon: Package },
    { label: "Admin", href: "/admin", icon: Users },
  ];

  return (
    <aside className="sneat-sidebar fixed inset-y-0 left-0 z-40 w-64 flex flex-col px-5 py-6">
      <div className="flex items-center gap-3 pb-8">
        <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-text-muted">
            Imajin
          </p>
          <p className="text-lg font-semibold text-foreground">Asset</p>
        </div>
      </div>

      <nav className="space-y-1 text-sm font-medium">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-text-muted hover:bg-secondary hover:text-foreground transition-colors"
          >
            <item.icon className="size-4 text-primary" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

### Navbar

```tsx
import { Bell, Search, User } from "lucide-react";

export function AppNavbar() {
  return (
    <header className="sneat-nav sticky top-0 z-30 flex h-16 items-center gap-4 px-6">
      <button className="hidden lg:inline-flex sneat-btn sneat-btn-outlined">
        <Search className="size-4" />
        <span>Search asset</span>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <button className="relative size-10 rounded-2xl bg-secondary/70 text-primary">
          <Bell className="size-4" />
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2">
          <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <User className="size-4" />
          </div>
          <div className="text-sm leading-tight">
            <p className="font-semibold text-foreground">Dewi Anjani</p>
            <p className="text-xs text-text-muted">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Card

```tsx
export function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="surface-card flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">{label}</p>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
      <span className="sneat-chip bg-success/10 text-success">{trend}</span>
    </div>
  );
}
```

### Table

```tsx
export function AssetTable() {
  return (
    <div className="surface-card overflow-hidden">
      <table className="sneat-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Kategori</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>AST-001</td>
            <td>Macbook Pro 16</td>
            <td>IT Equipment</td>
            <td><span className="sneat-chip bg-success/10 text-success">Aktif</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

### Form Input + Button

```tsx
export function AssetForm() {
  return (
    <form className="surface-card space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Nama Asset</span>
          <input className="sneat-input" placeholder="Contoh: Laptop Finance" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Kategori</span>
          <input className="sneat-input" placeholder="IT, Office, dll" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="sneat-btn sneat-btn-primary">
          Simpan Asset
        </button>
        <button type="button" className="sneat-btn sneat-btn-soft">
          Batalkan
        </button>
      </div>
    </form>
  );
}
```

### Dashboard Layout Grid

```tsx
export function DashboardGrid({ sidebar, main }: { sidebar: React.ReactNode; main: React.ReactNode }) {
  return (
    <section className="dashboard-layout max-w-7xl mx-auto px-6 py-8">
      <div className="surface-panel">{sidebar}</div>
      <div className="space-y-6">
        <div className="dashboard-grid">{main}</div>
        <div className="surface-card">Konten tambahan</div>
      </div>
    </section>
  );
}
```

Seluruh komponen di atas memanfaatkan token dan kelas baru agar UI konsisten, profesional, serta mudah diperluas tanpa mengganggu fungsi aplikasi.
