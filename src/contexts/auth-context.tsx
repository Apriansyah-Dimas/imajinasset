"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { clearClientAuthToken, getClientAuthToken, setClientAuthToken } from "@/lib/client-auth";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SO_ASSET_USER" | "VIEWER" | "USER";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // Check if we have a token in storage/cookie
      const token = getClientAuthToken();

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Get user data from our API
      const response = await fetch(`/api/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          // Clear invalid token
          clearClientAuthToken();
          setUser(null);
        }
      } else {
        clearClientAuthToken();
        setUser(null);
      }
    } catch (error) {
      console.error("Refresh user error:", error);
      clearClientAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      // Login to our API
      const checkResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!checkResponse.ok) {
        let errorMessage = "Invalid credentials";
        try {
          const errorBody = await checkResponse.json();
          if (typeof errorBody?.error === "string" && errorBody.error.trim()) {
            errorMessage = errorBody.error;
          }
        } catch {
          const errorText = await checkResponse.text().catch(() => "");
          if (errorText) {
            errorMessage = errorText;
          }
        }

        if (checkResponse.status >= 500) {
          console.error("Login failed with status:", checkResponse.status, errorMessage);
        }
        return { success: false, message: errorMessage };
      }

      const loginData = await checkResponse.json();

      if (loginData.success && loginData.user && loginData.token) {
        // Store token for subsequent requests
        setClientAuthToken(loginData.token);
        setUser(loginData.user);
        return { success: true };
      } else {
        return {
          success: false,
          message: "Unexpected response from server. Please try again."
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Unable to sign in. Please try again."
      };
    }
  };

  const logout = async () => {
    try {
      // Clear token and user
      clearClientAuthToken();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    // Initial check on mount
    refreshUser();

    // Optional: Refresh user data periodically (every 5 minutes)
    const interval = setInterval(() => {
      const token = getClientAuthToken();
      if (token) {
        refreshUser();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Instead of throwing error, return a safe default
    console.error("useAuth must be used within an AuthProvider");
    return {
      user: null,
      loading: false,
      login: async () => ({ success: false, message: "Authentication not available" }),
      logout: async () => {},
      refreshUser: async () => {}
    };
  }
  return context;
}
