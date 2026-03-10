"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth-store";

export type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  loginWithToken: (token: string | null, user?: User | null) => void;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const publicPaths = new Set(["/", "/login", "/register", "/search", "/lease-specials"]);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hydrated = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = async () => {
    try {
      const data = await api.me();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    refresh();
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentPath = pathname ?? "/";
    if (currentPath === "/" && user) {
      const role = user.role ?? "";
      if (role === "admin" || role === "broker_admin" || role === "super_admin") {
        router.replace("/admin");
        return;
      }
      if (role === "dealer") {
        router.replace("/dashboard/dealer");
        return;
      }
      router.replace("/dashboard/customer");
      return;
    }
    const isPublic =
      publicPaths.has(currentPath) ||
      currentPath.startsWith("/vehicles/") ||
      currentPath === "/reviews" ||
      currentPath === "/credit-application" ||
      currentPath === "/testimonials" ||
      currentPath === "/most-reviewed-auto-broker-los-angeles";
    if (!isPublic && !user) {
      const returnUrl = currentPath && currentPath !== "/" ? encodeURIComponent(currentPath) : "";
      router.replace(returnUrl ? `/login?returnUrl=${returnUrl}` : "/login");
    }
  }, [loading, user, pathname, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginWithToken: (token, nextUser) => {
        authStore.setToken(token);
        setUser(nextUser ?? user);
      },
      refresh,
      logout: () => {
        authStore.setToken(null);
        setUser(null);
        router.replace("/login");
      }
    }),
    [loading, user, router]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
