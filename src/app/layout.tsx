import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/navbar";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="flex">
            <Navbar />
            <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-0">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
