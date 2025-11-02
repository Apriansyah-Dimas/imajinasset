"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Search,
  Plus,
  FileText,
  Users,
  LogOut,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Role-based navigation
  const getNavigation = () => {
    const baseNav = [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Assets", href: "/assets", icon: Package },
    ];

    // Add SO Asset for Admin and SO Asset Users
    if (user && (user.role === "ADMIN" || user.role === "SO_ASSET_USER")) {
      baseNav.push({ name: "SO Asset", href: "/so-asset", icon: Search });
    }

    // Add Admin menu for Admin users
    if (user && user.role === "ADMIN") {
      baseNav.push({ name: "Admin", href: "/admin", icon: Users });
    }

    return baseNav;
  };

  const navigation = getNavigation();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div
        className={cn(
          "fixed top-4 left-4 z-[60] transition-all duration-300",
          !isMobile && "hidden"
        )}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-all duration-200 touch-none",
            "shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          )}
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 transition-all duration-300 ease-in-out",
          "w-64 h-screen gradient-sidebar",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isMobile && "shadow-2xl",
          "will-change-transform"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 sm:p-4 min-h-[80px] flex items-center">
            <Link
              href="/"
              className="flex items-center justify-end w-full"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-primary-foreground font-bold text-base sm:text-lg text-right text-shadow-white">
                AssetSO
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent text-accent-foreground flex items-center justify-center ml-3 sm:ml-4 flex-shrink-0 rounded-lg overflow-hidden">
                <img
                  src="/logo.svg"
                  alt="AssetSO Logo"
                  className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="mb-4 sm:mb-6">
              <div className="px-3 py-2 text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider text-shadow-white">
                Main Menu
              </div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-2 sm:space-x-3 px-3 sm:px-3 py-3 sm:py-2 text-xs sm:text-sm font-medium rounded transition-all duration-200",
                        "hover:transform hover:scale-105 active:scale-95 touch-none",
                        "min-h-[44px] sm:min-h-[40px]", // WCAG minimum touch target
                        isActive(item.href)
                          ? "bg-accent text-accent-foreground hover:bg-accent/90"
                          : "text-primary-foreground/90 hover:bg-primary/80 hover:text-primary-foreground active:bg-primary/70 text-shadow-white"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Info & Footer */}
          <div className="p-3 sm:p-4">
            {user ? (
              <div className="space-y-3">
                {/* User Info */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-primary-foreground/70 truncate">
                      {user.role.replace("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={async () => {
                    await logout();
                    router.push("/login");
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-primary-foreground/80 border border-primary/50 rounded hover:bg-primary/80 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-2 px-3 py-2 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              </div>
            )}

            {/* Copyright */}
            <div className="text-xs text-primary-foreground/60 text-center mt-3 pt-3">
              © 2025 Asset Management System
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-30 bg-primary/90 transition-all duration-300 touch-none",
            sidebarOpen
              ? "bg-opacity-50 backdrop-blur-sm pointer-events-auto"
              : "bg-opacity-0 pointer-events-none"
          )}
          onClick={() => setSidebarOpen(false)}
          onTouchStart={() => {
            // Optional: Add haptic feedback on touch devices if supported
            if ("vibrate" in navigator) {
              navigator.vibrate(10);
            }
          }}
        />
      )}
    </>
  );
}
