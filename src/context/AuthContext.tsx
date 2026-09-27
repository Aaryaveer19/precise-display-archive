import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@/lib/types";
import * as api from "@/services/api";
import { supabase } from "@/lib/supabase";

interface AuthValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
      if (session?.user) {
        setUserState({
          user_id: session.user.id,
          name: session.user.user_metadata?.['name'] || 'User',
          email: session.user.email || '',
          has_farm_profile: true // Usually checked via another query, but simplified here
        });
      }
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    setToken(res.token);
    setUserState(res.user);
    return res.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.signup(name, email, password);
    setToken(res.token);
    setUserState(res.user);
    return res.user;
  }, []);

  const setUser = useCallback((u: User) => {
    setUserState(u);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setToken(null);
    setUserState(null);
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
