import { supabase } from "@/integrations/supabase/client";

export async function logAction(params: {
  action: string;
  entity: string;
  entity_id?: string;
  description?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
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
