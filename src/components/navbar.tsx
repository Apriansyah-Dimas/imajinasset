"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import type { LucideIcon } from "lucide-react";

type NavigationChild = {
  name: string;
  href?: string;
  icon: LucideIcon;
  action?: "logout";
};

type NavigationItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  children?: NavigationChild[];
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isSidebarOpen, setIsSidebarOpen, toggleSidebar, isMobile, setIsMobile } = useSidebar();
  const lastIsMobileRef = useRef<boolean | null>(null);
  const reduceMotion = useMotionPreference();

  const navigation = useMemo<NavigationItem[]>(() => {
    const baseNav: NavigationItem[] = [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Assets", href: "/assets", icon: Package },
    ];

    const role = user?.role;

    if (role === "ADMIN" || role === "SO_ASSET_USER") {
      baseNav.push({ name: "Check Out", href: "/check-out", icon: LogOut });
      baseNav.push({ name: "Check In", href: "/check-in", icon: LogIn });
    }

    if (role === "ADMIN" || role === "SO_ASSET_USER" || role === "VIEWER") {
      baseNav.push({ name: "SO Asset", href: "/so-asset", icon: Search });
    }

    if (role === "ADMIN") {
      baseNav.push({ name: "User Management", href: "/admin/users", icon: Users });
      baseNav.push({ name: "Backup & Restore", href: "/admin/backup", icon: Database });
    }

    return baseNav;
  }, [user]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleViewportChange = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (lastIsMobileRef.current === null || lastIsMobileRef.current !== mobile) {
        setIsSidebarOpen(!mobile);
        lastIsMobileRef.current = mobile;
      }
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange, { passive: true });
    return () => window.removeEventListener("resize", handleViewportChange);
  }, [setIsMobile, setIsSidebarOpen]);

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev };
      navigation.forEach((item) => {
        if (!item.children) return;
        const hasActiveChild = item.children.some((child) => isActive(child.href));
        if (hasActiveChild) {
          next[item.name] = true;
        }
      });
      return next;
    });
  }, [navigation, pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === href;
    return pathname.startsWith(href);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const isSectionExpanded = (section: string, fallback: boolean) => {
    const stored = expandedSections[section];
    return typeof stored === "boolean" ? stored : fallback;
  };

  const handleChildAction = async (child: NavigationChild) => {
    if (child.action === "logout") {
      await logout();
      router.push("/login");
    }
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const mobileToggleClasses = useMemo(
    () =>
      cn(
        "flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-white text-primary shadow-sm touch-none",
        reduceMotion
          ? "transition-opacity duration-150"
          : "transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-0.5 hover:shadow-lg hover:scale-105 active:scale-95"
      ),
    [reduceMotion]
  );

  const sidebarClasses = useMemo(
    () =>
      cn(
        "fixed top-0 left-0 z-50 flex h-screen w-60 flex-col sneat-sidebar px-4 will-change-transform",
        reduceMotion
          ? "transition-all duration-200 ease-in-out"
          : "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
        isMobile ? "shadow-2xl" : "shadow-lg"
      ),
    [reduceMotion, isSidebarOpen, isMobile]
  );

  const collapsedToggleClasses = useMemo(
    () =>
      cn(
        "flex h-14 w-8 items-center justify-center rounded-r-full bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(15,18,63,0.24)] ring-1 ring-primary/40",
        reduceMotion
          ? "transition-opacity duration-150"
          : "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-1 hover:shadow-[0_18px_45px_rgba(15,18,63,0.3)] active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      ),
    [reduceMotion]
  );

  const overlayClasses = useMemo(
    () =>
      cn(
        "fixed inset-0 z-[45] bg-[#1f2041]/20 backdrop-blur-sm transition-opacity",
        isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      ),
    [isSidebarOpen]
  );

  const navItemBaseClasses = useMemo(
    () =>
      reduceMotion
        ? "flex min-h-[40px] items-center gap-3 px-3.5 py-2.5 text-[0.7rem] font-medium transition-colors duration-150 relative"
        : "flex min-h-[40px] items-center gap-3 px-3.5 py-2.5 text-[0.7rem] font-medium transition-all duration-200 hover:-translate-y-0.5 relative",
    [reduceMotion]
  );

  const childNavItemClasses = useMemo(
    () =>
      reduceMotion
        ? "flex w-full min-h-[36px] items-center gap-2 rounded-xl px-3 py-2 text-[0.65rem] font-medium transition-colors duration-150"
        : "flex w-full min-h-[36px] items-center gap-2 rounded-xl px-3 py-2 text-[0.65rem] font-medium transition-all duration-200 hover:-translate-y-0.5",
    [reduceMotion]
  );

  return (
    <>
      {/* Toggle button (mobile) */}
      {isMobile && (
        <div
          className={cn(
            "fixed top-4 left-4 z-[40] flex",
            reduceMotion ? "transition-opacity duration-150" : "transition-all duration-300"
          )}
        >
          <button
            onClick={toggleSidebar}
            className={mobileToggleClasses}
            aria-label={isSidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={sidebarClasses}>
        <div className="flex h-full flex-col gap-6 py-6">
          {/* Header with toggle button */}
          <div className="flex items-center justify-between px-1">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => {
                if (isMobile) {
                  setIsSidebarOpen(false);
                }
              }}
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <LayoutDashboard className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.52rem] font-semibold uppercase tracking-[0.45em] text-text-muted">
                  Imajin
                </span>
                <span className="text-lg font-semibold text-foreground">Asset</span>
              </div>
            </Link>

          </div>

          <nav className="flex-1 overflow-y-auto pr-1">
            <div className="mb-6 space-y-3">
              <div className="px-1 text-[0.52rem] font-semibold uppercase tracking-[0.6em] text-text-muted">
                Main Menu
              </div>
              <div className="space-y-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = Boolean(item.children?.length);

                  if (hasChildren && item.children) {
                    const hasActiveChild = item.children.some((child) =>
                      isActive(child.href)
                    );
                    const expanded = isSectionExpanded(item.name, hasActiveChild);

                    return (
                      <div key={item.name} className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSection(item.name)}
                          className={cn(
                            navItemBaseClasses,
                            "w-full justify-between text-left border border-transparent",
                            expanded || hasActiveChild
                              ? "bg-secondary text-foreground shadow-[0_12px_30px_rgba(99,101,185,0.12)]"
                              : "text-text-muted hover:bg-secondary/60 hover:text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-primary transition-transform duration-200",
                              expanded ? "rotate-180" : "rotate-0"
                            )}
                          />
                        </button>

                        {expanded && (
                          <div className="ml-3 space-y-1 border-l border-border/60 pl-3">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive = child.href ? isActive(child.href) : false;
                              const commonClasses = cn(
                                childNavItemClasses,
                                "border border-transparent relative",
                                childActive
                                  ? "text-foreground"
                                  : "text-text-muted hover:text-foreground"
                              );

                              if (child.href) {
                                return (
                                  <Link
                                    key={child.name}
                                    href={child.href}
                                    className={commonClasses}
                                    onClick={() => {
                                      if (isMobile) {
                                        setIsSidebarOpen(false);
                                      }
                                    }}
                                  >
                                    {childActive && (
                                      <>
                                        <div
                                          className="absolute inset-y-0 left-0 right-0 bg-secondary shadow-[0_12px_30px_rgba(99,101,185,0.08)] rounded-l-xl z-0"
                                          style={{
                                            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'
                                          }}
                                        />
                                      </>
                                    )}
                                    <ChildIcon className="h-4 w-4 text-primary relative z-10" />
                                    <span className="truncate relative z-10">{child.name}</span>
                                  </Link>
                                );
                              }

                              return (
                                <button
                                  key={child.name}
                                  type="button"
                                  className={cn(commonClasses, "text-left")}
                                  onClick={() => handleChildAction(child)}
                                >
                                  {childActive && (
                                    <>
                                      <div
                                        className="absolute inset-y-0 left-0 right-0 bg-secondary shadow-[0_12px_30px_rgba(99,101,185,0.08)] rounded-l-xl z-0"
                                        style={{
                                          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'
                                        }}
                                      />
                                    </>
                                  )}
                                  <ChildIcon className="h-4 w-4 text-primary relative z-10" />
                                  <span className="truncate relative z-10">{child.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (!item.href) return null;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        navItemBaseClasses,
                        active
                          ? "text-foreground"
                          : "text-text-muted hover:text-foreground",
                        "border border-transparent"
                      )}
                      onClick={() => {
                        if (isMobile) {
                          setIsSidebarOpen(false);
                        }
                      }}
                    >
                      {active && (
                        <>
                          <div
                            className="absolute inset-y-0 left-0 right-0 bg-secondary shadow-[0_12px_30px_rgba(99,101,185,0.12)] rounded-l-2xl z-0"
                            style={{
                              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                            }}
                          />
                        </>
                      )}
                      <Icon className="h-4 w-4 text-primary relative z-10" />
                      <span className="truncate relative z-10">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="space-y-3 px-1">
            {user ? (
              <div className="rounded-2xl border border-border bg-white px-3.5 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <User className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.65rem] font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-[0.45rem] uppercase tracking-[0.25em] text-text-muted">
                      {user.role.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      router.push("/login");
                    }}
                    className="text-[0.52rem] font-medium text-primary hover:text-primary/80"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-center">
                <p className="text-sm text-text-muted">Belum masuk</p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 sneat-btn sneat-btn-primary"
                >
                  <User className="size-4" />
                  <span>Login</span>
                </Link>
              </div>
            )}

            <div className="text-center text-[0.55rem] text-text-muted">
              &copy; {new Date().getFullYear()} Imajin Asset
            </div>
          </div>
        </div>
      </div>

      {/* Only show overlay on mobile when sidebar is open */}
      {isMobile && (
        <div
          className={overlayClasses}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {!isMobile && (
        <div
          className={cn(
            "fixed top-1/2 z-[40] -translate-y-1/2 transform-gpu transition-all duration-300",
            isSidebarOpen ? "left-[16rem] -translate-x-1/2" : "left-0"
          )}
        >
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={collapsedToggleClasses}
            title={isSidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
            aria-label={isSidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
          >
            <div className="flex items-center justify-center w-full h-full">
              {isSidebarOpen ? (
                <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5 text-white drop-shadow-sm -ml-1" />
              ) : (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-white drop-shadow-sm -ml-1" />
              )}
            </div>
          </button>
        </div>
      )}
    </>
  );
}
