"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";
import { useSidebarMargin } from "@/hooks/useSidebarMargin";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { cn } from "@/lib/utils";

const IMMERSIVE_ROUTES = ["/login", "/register", "/logout", "/unauthorized"];

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useMotionPreference();

  const isImmersiveRoute = useMemo(() => {
    if (!pathname) return false;
    return IMMERSIVE_ROUTES.some((route) =>
      pathname === route || pathname.startsWith(`${route}/`)
    );
  }, [pathname]);

  useSidebarMargin({ disabled: isImmersiveRoute });

  if (isImmersiveRoute) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-background text-foreground"
      >
        {children}
      </main>
    );
  }

  return (
    <div className="flex">
      <Navbar />
      <main
        className={cn(
          "flex-1 min-h-screen pt-16 lg:pt-0",
          reduceMotion
            ? "transition-[margin] duration-200 ease-in-out"
            : "transition-[margin] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        )}
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
