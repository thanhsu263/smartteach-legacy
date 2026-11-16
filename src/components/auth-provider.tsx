"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ownerDrafts, pauseDrafts, resumeDrafts } from "@/lib/drafts/storage";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AuthUser = { id: string; email: string | null };

export type AuthState = {
  /** "loading" cho tới khi biết chắc có phiên hay không; khách được coi như "signed-out". */
  status: "loading" | "signed-in" | "signed-out";
  user: AuthUser | null;
  /** false khi chưa cấu hình Supabase: ứng dụng chạy ở chế độ khách. */
  configured: boolean;
  signOut: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);
const subscribeHydration = () => () => {};
const clientHydration = () => true;
const serverHydration = () => false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const configured = getSupabaseConfig() !== null;
  const [session, setSession] = useState<{ user: AuthUser | null } | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const activeUser = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    // Sự kiện INITIAL_SESSION cho biết phiên hiện có (đọc từ cookie, không gọi mạng).
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (activeUser.current && activeUser.current !== next?.user?.id) pauseDrafts(activeUser.current);
      activeUser.current = next?.user?.id ?? null;
      if (activeUser.current) resumeDrafts(activeUser.current);
      setSession({ user: next?.user ? { id: next.user.id, email: next.user.email ?? null } : null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    setSignOutError(null);
    try {
      const db = getBrowserSupabase();
      if (!db) return false;
      const owner = activeUser.current;
      if (owner) {
        try {
          if (await ownerDrafts(owner) && !window.confirm("Đăng xuất sẽ dọn nháp chưa lưu trên máy này. Thầy cô muốn tiếp tục?")) return false;
        } catch { if (!window.confirm("Không đọc được kho nháp. Đăng xuất có thể khiến nháp trên máy này không được dọn; tiếp tục?")) return false; }
        pauseDrafts(owner);
      }
      const { error } = await db.auth.signOut();
      if (error) {
        if (owner && activeUser.current === owner) resumeDrafts(owner);
        setSignOutError(activeUser.current ? "Chưa thể đăng xuất. Nháp vẫn được giữ; thầy cô thử lại nhé." : "Đã thoát phiên trên thiết bị, nhưng chưa thu hồi được phiên trên máy chủ. Nháp vẫn được giữ; thầy cô đăng nhập lại để thử.");
        return false;
      }
      if (owner) { try { await ownerDrafts(owner, true); } catch { setSignOutError("Đã đăng xuất nhưng chưa dọn được kho nháp. Thầy cô xóa dữ liệu trang trên thiết bị dùng chung nhé."); } }
      router.push("/");
      router.refresh();
      return true;
    } catch { if (activeUser.current) resumeDrafts(activeUser.current); setSignOutError("Không kết nối được máy chủ để đăng xuất. Thầy cô thử lại nhé."); return false; }
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

  return <AuthContext value={value}>{signOutError && <p role="alert">{signOutError}</p>}{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydration, serverHydration);
  if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
  // Auth may resolve before a streamed Suspense subtree hydrates. Its first client snapshot
  // must match the server's loading snapshot, then expose the live account after hydration.
  return hydrated ? value : { ...value, status: value.configured ? "loading" : "signed-out", user: null };
}
