import { supabase } from "@/integrations/supabase/client";

export async function logAction(params: {
  action: string;
  entity: string;
  entity_id?: string;
  description?: string;
}) {
  // getSession lê do cache local (sem ida à rede); getUser validava o token online a cada chamada.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  await supabase.from("audit_log").insert({
    user_id: user.id,
    user_email: user.email,
    action: params.action,
    entity: params.entity,
    entity_id: params.entity_id ?? null,
    description: params.description ?? null,
  });
}
