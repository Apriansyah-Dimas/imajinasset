"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SO_ASSET_USER" | "VIEWER";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      console.log("Refreshing user...");

      // Check if we have a token in localStorage
      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.log("No token found in localStorage");
        setUser(null);
        setLoading(false);
        return;
      }

      console.log("Found token in localStorage, getting user data...");

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
          console.log("User refreshed successfully:", data.user);
        } else {
          // Clear invalid token
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } else {
        console.log("Failed to get user data, clearing token and user");
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch (error) {
      console.error("Refresh user error:", error);
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Attempting login with:", email);

      // Login to our API
      const checkResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log("Login response status:", checkResponse.status);
      console.log("Login response ok:", checkResponse.ok);

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error("Login failed with status:", checkResponse.status, errorText);
        return false;
      }

      const loginData = await checkResponse.json();
      console.log("Login response data:", loginData);

      if (loginData.success && loginData.user && loginData.token) {
        // Store token in localStorage
        localStorage.setItem('auth_token', loginData.token);
        setUser(loginData.user);
        console.log("Login successful:", loginData.user);
        return true;
      } else {
        console.error("Invalid login response format:", loginData);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out...");

      // Clear token and user
      localStorage.removeItem('auth_token');
      setUser(null);
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    // Initial check on mount
    refreshUser();
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
