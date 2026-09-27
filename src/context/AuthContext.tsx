import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@/lib/types";
import { KEYS, read, remove, write } from "@/services/storage";
import * as api from "@/services/api";

interface AuthValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  signup: (name: string, phone: string, password: string) => Promise<User>;
  setUser: (u: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setToken(read<string | null>(KEYS.token, null));
    setUserState(read<User | null>(KEYS.user, null));
    setReady(true);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    setToken(res.token);
    setUserState(res.user);
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, phone: string, password: string) => {
    const res = await api.signup(name, phone, password);
    setToken(res.token);
    setUserState(res.user);
    return res.user;
  }, []);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    write(KEYS.user, u);
  }, []);

  const logout = useCallback(() => {
    remove(KEYS.token);
    setToken(null);
    navigate({ to: "/login" });
  }, [navigate]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      token,
      ready,
      isAuthenticated: Boolean(token),
      login,
      signup,
      setUser,
      logout,
    }),
    [user, token, ready, login, signup, setUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
