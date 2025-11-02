"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteMultiProps {
  children: React.ReactNode;
  allowedRoles?: ("ADMIN" | "SO_ASSET_USER" | "VIEWER")[];
  fallbackPath?: string;
}

export default function ProtectedRouteMulti({
  children,
  allowedRoles,
  fallbackPath = "/login",
}: ProtectedRouteMultiProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If still loading, do nothing
    if (loading) return;

    // If no user, redirect to login
    if (!user) {
      router.push(fallbackPath);
      return;
    }

    // If specific roles are allowed, check them
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.push("/unauthorized");
      return;
    }
  }, [user, loading, router, allowedRoles, fallbackPath]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no user, show nothing (will redirect)
  if (!user) {
    return null;
  }

  // If role is not in allowed roles, show nothing (will redirect)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
