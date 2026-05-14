"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CurrentUser {
  id: number;
  email: string;
  balance: number;
  emailVerified: boolean;
  status: string;
}

interface CurrentUserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: CurrentUser | null) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      setUser((json?.data as CurrentUser | null) ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  return (
    <CurrentUserContext.Provider value={{ user, loading, refresh, setUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error(
      "useCurrentUser must be used within CurrentUserProvider"
    );
  }
  return ctx;
}
