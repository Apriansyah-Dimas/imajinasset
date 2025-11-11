"use client";

import { useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";

export function useSidebarMargin() {
  const { isSidebarOpen, isMobile } = useSidebar();
  const reduceMotion = useMotionPreference();

  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      if (isMobile) {
        // Mobile: full width always
        mainContent.style.marginLeft = "0";
        mainContent.style.transition = reduceMotion
          ? "margin-left 0.2s ease-in-out"
          : "margin-left 0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
      } else {
        // Desktop: adjust margin based on sidebar state
        if (isSidebarOpen) {
          mainContent.style.marginLeft = "15rem"; // w-60 = 240px
        } else {
          mainContent.style.marginLeft = "0";
        }
        mainContent.style.transition = reduceMotion
          ? "margin-left 0.2s ease-in-out"
          : "margin-left 0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
      }
    }
  }, [isSidebarOpen, isMobile, reduceMotion]);
}
