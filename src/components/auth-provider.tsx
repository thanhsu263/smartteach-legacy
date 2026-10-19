"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AuthUser = { id: string; email: string | null };

export type AuthState = {
  /** "loading" cho tới khi biết chắc có phiên hay không; khách được coi như "signed-out". */
  status: "loading" | "signed-in" | "signed-out";
  user: AuthUser | null;
  /** false khi chưa cấu hình Supabase: ứng dụng chạy ở chế độ khách. */
  configured: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const configured = getSupabaseConfig() !== null;
  const [session, setSession] = useState<{ user: AuthUser | null } | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    // Sự kiện INITIAL_SESSION cho biết phiên hiện có (đọc từ cookie, không gọi mạng).
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession({ user: next?.user ? { id: next.user.id, email: next.user.email ?? null } : null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await getBrowserSupabase()?.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const value = useMemo<AuthState>(() => {
    if (!configured) return { status: "signed-out", user: null, configured, signOut };
    if (session === null) return { status: "loading", user: null, configured, signOut };
    return {
      status: session.user ? "signed-in" : "signed-out",
      user: session.user,
      configured,
      signOut,
    };
  }, [configured, session, signOut]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
  return value;
}
