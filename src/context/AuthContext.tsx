"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User } from "@/lib/types";
import {
  getAuthUser,
  initStorage,
  selfRegister,
  loginWithCredential,
  logoutUser,
  setRememberedAccount,
  getRememberedAccount,
} from "@/lib/storage";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/client";
import { resetDataSync } from "@/lib/data-sync";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  rememberedAccount: string;
  login: (
    account: string,
    password: string,
    remember: boolean
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: {
    username: string;
    name: string;
    department: string;
    password: string;
  }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberedAccount, setRemembered] = useState("");

  useEffect(() => {
    initStorage();

    async function restoreSession() {
      if (isSupabaseEnabled()) {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, name, department, role")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            const restored: User = {
              id: profile.id,
              username: profile.username,
              name: profile.name,
              department: profile.department,
              role: profile.role,
              password: "",
            };
            setUser(restored);
            setLoading(false);
            return;
          }
        }
      } else {
        setUser(getAuthUser());
      }

      setRemembered(getRememberedAccount());
      setLoading(false);
    }

    void restoreSession();
  }, []);

  const login = useCallback(
    async (account: string, password: string, remember: boolean) => {
      const found = await loginWithCredential(account, password);
      if (!found) return false;
      setUser(found);
      setRememberedAccount(remember ? account : "");
      setRemembered(remember ? account : "");
      return true;
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutUser();
    resetDataSync();
    setUser(null);
  }, []);

  const register = useCallback(
    async (data: {
      username: string;
      name: string;
      department: string;
      password: string;
    }) => selfRegister(data),
    []
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, rememberedAccount, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
