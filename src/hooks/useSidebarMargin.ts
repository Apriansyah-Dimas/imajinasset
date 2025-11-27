"use client";

import { useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";

type SidebarMarginOptions = {
  disabled?: boolean;
};

export function useSidebarMargin(options: SidebarMarginOptions = {}) {
  const { disabled = false } = options;
  const { isSidebarOpen, isMobile } = useSidebar();
  const reduceMotion = useMotionPreference();

  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    if (disabled) {
      mainContent.style.marginLeft = "0";
      mainContent.style.transition = reduceMotion
        ? "margin-left 0.15s ease-out"
        : "margin-left 0.25s ease-out";
      return;
    }

    if (isMobile) {
      mainContent.style.marginLeft = "0";
      mainContent.style.transition = reduceMotion
        ? "margin-left 0.2s ease-in-out"
        : "margin-left 0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
    } else {
      mainContent.style.marginLeft = isSidebarOpen ? "15rem" : "0";
      mainContent.style.transition = reduceMotion
        ? "margin-left 0.2s ease-in-out"
        : "margin-left 0.3s cubic-bezier(0.25,0.46,0.45,0.94)";
    }
  }, [disabled, isSidebarOpen, isMobile, reduceMotion]);
}
