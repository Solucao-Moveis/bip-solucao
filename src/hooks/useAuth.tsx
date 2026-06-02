import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

// SMERP SSO: se o ERP abriu este app com a sessão no hash (#smerp_sso&at=&rt=),
// adota essa sessão e limpa a URL — assim a pessoa entra sem logar de novo.
async function consumeSmerpSso() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash || hash.indexOf("smerp_sso") === -1) return;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access_token = params.get("at");
  const refresh_token = params.get("rt");
  if (access_token && refresh_token) {
    try {
      await supabase.auth.setSession({ access_token, refresh_token });
    } catch (e) {
      console.error("[SMERP SSO]", e);
    }
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .eq("role", "admin")
            .maybeSingle()
            .then(({ data }) => setIsAdmin(!!data));
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    (async () => {
      await consumeSmerpSso();
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setLoading(false);
      if (s?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await supabase.from("audit_log").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      user_email: email,
      action: "login",
      entity: "auth",
      description: `Login realizado`,
    });
    return {};
  };

  const signOut = async () => {
    const u = session?.user;
    if (u) {
      await supabase.from("audit_log").insert({
        user_id: u.id,
        user_email: u.email,
        action: "logout",
        entity: "auth",
        description: "Logout realizado",
      });
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
