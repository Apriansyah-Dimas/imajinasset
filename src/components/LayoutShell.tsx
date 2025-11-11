"use client";

import { ReactNode } from "react";
import Navbar from "@/components/navbar";
import { useSidebarMargin } from "@/hooks/useSidebarMargin";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { cn } from "@/lib/utils";

export function LayoutShell({ children }: { children: ReactNode }) {
  useSidebarMargin();
  const reduceMotion = useMotionPreference();

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
