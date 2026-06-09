import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Papéis do Registro de Carregamento vivem no schema 'expedicao'
// (separados dos papéis admin/user do BIP). Carregado pela sessão atual.
export type ExpRole = "pcp" | "carregador" | "faturamento" | "admin";

interface ExpedicaoCtx {
  roles: ExpRole[];
  loading: boolean;
  isMember: boolean;
  has: (...r: ExpRole[]) => boolean;
}

const Ctx = createContext<ExpedicaoCtx | undefined>(undefined);

export function ExpedicaoProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [roles, setRoles] = useState<ExpRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = session?.user?.id;
      if (!uid) {
        if (active) { setRoles([]); setLoading(false); }
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .schema("expedicao" as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (active) {
        setRoles(((data ?? []) as any[]).map((r) => r.role) as ExpRole[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  const has = (...r: ExpRole[]) => r.some((x) => roles.includes(x));
  return <Ctx.Provider value={{ roles, loading, isMember: roles.length > 0, has }}>{children}</Ctx.Provider>;
}

export function useExpedicao(): ExpedicaoCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useExpedicao must be used within ExpedicaoProvider");
  return c;
}
