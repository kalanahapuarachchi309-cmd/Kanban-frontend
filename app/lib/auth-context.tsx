"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, isAuthenticated, login, logout } from "./api/auth";
import type { LoginRequest } from "./api/auth";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuth: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser({
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        initials: currentUser.username.substring(0, 2).toUpperCase(),
        avatarColor: getAvatarColor(currentUser.id),
        mustChangePassword: currentUser.mustChangePassword,
        isActive: currentUser.isActive,
      });
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (credentials: LoginRequest) => {
    await login(credentials);
    const currentUser = getCurrentUser();

    if (!currentUser) {
      setUser(null);
      return;
    }

    setUser({
      id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      role: currentUser.role,
      initials: currentUser.username.substring(0, 2).toUpperCase(),
      avatarColor: getAvatarColor(currentUser.id),
      mustChangePassword: currentUser.mustChangePassword,
      isActive: currentUser.isActive,
    });
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuth: isAuthenticated(),
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function to generate consistent avatar colors
function getAvatarColor(id: number): string {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#22c55e",
    "#3b82f6", "#f59e0b", "#14b8a6", "#ef4444"
  ];
  return colors[id % colors.length];
}
