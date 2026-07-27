import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  adminLogin,
  adminLogout,
  adminVerifyLogin,
  cacheUser,
  clearTokens,
  readCachedUser,
  setTokens,
  type AdminUser,
} from "@/lib/api";

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ email: string }>;
  verifyCode: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readCachedUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await adminLogin(username, password);
    return { email: res.email };
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await adminVerifyLogin(email, code);
    if (res.user.role !== "admin") {
      clearTokens();
      throw new Error("Admin access required");
    }
    setTokens(res.accessToken, res.refreshToken);
    cacheUser(res.user);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, verifyCode, logout }),
    [user, loading, login, verifyCode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
