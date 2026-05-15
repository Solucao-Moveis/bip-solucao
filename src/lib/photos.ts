import { supabase } from "@/integrations/supabase/client";
import { logAction } from "./audit";

export interface LoadingPhoto {
  id: string;
  order_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  url: string;
}

const BUCKET = "loading-photos";

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getOrderPhotos(orderId: string): Promise<LoadingPhoto[]> {
  const { data, error } = await supabase
    .from("loading_photos" as never)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  if (error || !data) return [];
  return (data as any[]).map((p) => ({ ...p, url: publicUrl(p.storage_path) }));
}

export async function uploadOrderPhoto(
  orderId: string,
  file: File,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (upErr) return { success: false, error: upErr.message };

  const { error: insErr } = await supabase
    .from("loading_photos" as never)
    .insert({ order_id: orderId, storage_path: path, caption: caption || null } as never);
  if (insErr) return { success: false, error: insErr.message };

  await logAction({ action: "photo_add", entity: "loading_order", entity_id: orderId, description: `Adicionou foto${caption ? `: ${caption}` : ""}` });
  return { success: true };
}

export async function deleteOrderPhoto(photo: LoadingPhoto): Promise<{ success: boolean; error?: string }> {
  await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from("loading_photos" as never).delete().eq("id", photo.id);
  if (error) return { success: false, error: error.message };
  await logAction({ action: "photo_remove", entity: "loading_order", entity_id: photo.order_id, description: `Removeu foto` });
  return { success: true };
}
