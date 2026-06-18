import { supabase } from "@/integrations/supabase/client";
import { logAction } from "./audit";
import { compressImage } from "./image";

export interface LoadingPhoto {
  id: string;
  order_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  /** URL da imagem cheia (já comprimida). */
  url: string;
  /** URL da miniatura (~420px). Cai pra `url` se ainda não existir. */
  thumbUrl: string;
}

const BUCKET = "loading-photos";

// Parâmetros de compressão (ver lib/image.ts).
const FULL = { maxDim: 1600, quality: 0.72 };
const THUMB = { maxDim: 420, quality: 0.6 };
const RECOMPRESS_ABOVE = 1_200_000; // só recomprime no backfill se for maior que isso

// A miniatura mora ao lado da imagem cheia: `foo.jpg` -> `foo.thumb.jpg`.
function thumbPathFor(path: string): string {
  return path.replace(/(\.[^/.]+)$/, ".thumb$1");
}

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
  return (data as any[]).map((p) => ({
    ...p,
    url: publicUrl(p.storage_path),
    thumbUrl: publicUrl(thumbPathFor(p.storage_path)),
  }));
}

export async function uploadOrderPhoto(
  orderId: string,
  file: File,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  // Sempre gravamos como JPEG (recomprimido). Nome único por foto.
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const thumbPath = thumbPathFor(path);

  const [full, thumb] = await Promise.all([
    compressImage(file, FULL),
    compressImage(file, THUMB),
  ]);

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, full, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (upErr) return { success: false, error: upErr.message };

  // Miniatura é "melhor esforço": se falhar, a grade cai pra imagem cheia.
  await supabase.storage.from(BUCKET).upload(thumbPath, thumb, {
    contentType: "image/jpeg",
    upsert: true,
  });

  const { error: insErr } = await supabase
    .from("loading_photos" as never)
    .insert({ order_id: orderId, storage_path: path, caption: caption || null } as never);
  if (insErr) return { success: false, error: insErr.message };

  await logAction({ action: "photo_add", entity: "loading_order", entity_id: orderId, description: `Adicionou foto${caption ? `: ${caption}` : ""}` });
  return { success: true };
}

/**
 * Edita uma foto já enviada: troca a observação (caption) e/ou substitui a imagem.
 * Ao trocar a imagem, gravamos num caminho novo e apagamos o antigo — assim a URL
 * muda e o navegador não mostra a foto velha em cache.
 */
export async function updateOrderPhoto(
  photo: LoadingPhoto,
  opts: { caption?: string; file?: File | null }
): Promise<{ success: boolean; error?: string }> {
  if (opts.file) {
    const newPath = `${photo.order_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const newThumb = thumbPathFor(newPath);

    const [full, thumb] = await Promise.all([
      compressImage(opts.file, FULL),
      compressImage(opts.file, THUMB),
    ]);

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, full, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (upErr) return { success: false, error: upErr.message };

    await supabase.storage.from(BUCKET).upload(newThumb, thumb, {
      contentType: "image/jpeg",
      upsert: true,
    });

    const { error: updErr } = await supabase
      .from("loading_photos" as never)
      .update({ storage_path: newPath } as never)
      .eq("id", photo.id);
    if (updErr) return { success: false, error: updErr.message };

    // Imagem antiga vira lixo: remove (melhor esforço).
    await supabase.storage.from(BUCKET).remove([photo.storage_path, thumbPathFor(photo.storage_path)]);
  }

  if (opts.caption !== undefined) {
    const { error } = await supabase
      .from("loading_photos" as never)
      .update({ caption: opts.caption || null } as never)
      .eq("id", photo.id);
    if (error) return { success: false, error: error.message };
  }

  await logAction({
    action: "photo_edit",
    entity: "loading_order",
    entity_id: photo.order_id,
    description: `Editou foto${opts.file ? " (trocou a imagem)" : ""}${opts.caption !== undefined ? `: ${opts.caption}` : ""}`,
  });
  return { success: true };
}

export async function deleteOrderPhoto(photo: LoadingPhoto): Promise<{ success: boolean; error?: string }> {
  await supabase.storage.from(BUCKET).remove([photo.storage_path, thumbPathFor(photo.storage_path)]);
  const { error } = await supabase.from("loading_photos" as never).delete().eq("id", photo.id);
  if (error) return { success: false, error: error.message };
  await logAction({ action: "photo_remove", entity: "loading_order", entity_id: photo.order_id, description: `Removeu foto` });
  return { success: true };
}

export interface BackfillProgress {
  total: number;
  done: number;
  optimized: number;
  errors: number;
}

/**
 * Backfill: percorre as fotos já existentes, recomprime as grandes e garante a
 * miniatura de cada uma. Roda no navegador (admin), usando a sessão atual.
 */
export async function optimizeExistingPhotos(
  onProgress?: (p: BackfillProgress) => void
): Promise<BackfillProgress> {
  const { data } = await supabase
    .from("loading_photos" as never)
    .select("id, storage_path")
    .order("created_at");
  const rows = (data ?? []) as { id: string; storage_path: string }[];

  const progress: BackfillProgress = { total: rows.length, done: 0, optimized: 0, errors: 0 };
  onProgress?.({ ...progress });

  for (const row of rows) {
    try {
      const path = row.storage_path;
      const res = await fetch(publicUrl(path), { cache: "no-store" });
      if (!res.ok) throw new Error(`download ${res.status}`);
      const original = await res.blob();

      // Recomprime a imagem cheia só se ainda estiver pesada.
      if (original.size > RECOMPRESS_ABOVE) {
        const full = await compressImage(original, FULL);
        if (full.size < original.size) {
          await supabase.storage.from(BUCKET).upload(path, full, { contentType: "image/jpeg", upsert: true });
          progress.optimized++;
        }
      }

      // Gera/atualiza a miniatura (idempotente).
      const thumb = await compressImage(original, THUMB);
      await supabase.storage.from(BUCKET).upload(thumbPathFor(path), thumb, { contentType: "image/jpeg", upsert: true });
    } catch {
      progress.errors++;
    } finally {
      progress.done++;
      onProgress?.({ ...progress });
    }
  }

  await logAction({
    action: "photo_optimize",
    entity: "loading_order",
    entity_id: "*",
    description: `Otimizou fotos: ${progress.optimized} recomprimidas, ${progress.errors} erro(s) de ${progress.total}`,
  });
  return progress;
}
