import type { Metadata, Viewport } from "next";
import { Public_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { LayoutShell } from "@/components/LayoutShell";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imajin Asset",
  description: "Sistem manajemen aset perusahaan modern dengan fitur Stock Opname, maintenance tracking, dan backup & restore.",
  keywords: ["Asset Management", "Stock Opname", "Inventory", "Tracking", "Maintenance", "QR Code", "AssetSO"],
  authors: [{ name: "AssetSO Team" }],
  icons: {
    icon: "/logo-asset-management.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        data-force-motion="true"
        className={`${publicSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SidebarProvider>
            <LayoutShell>{children}</LayoutShell>
            <Toaster />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
