import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Registro de Carregamento DENTRO do BIP — fala com o schema 'expedicao'
// (o resto do BIP usa o schema 'bip'). Usamos supabase.schema('expedicao').
// Modelo: Carga (loadings) > Destino (loading_destinations) > Item (loading_items)
// ============================================================
const ex = () => supabase.schema("expedicao" as any) as any;

async function logExp(p: { action: string; entity: string; entity_id?: string; description?: string }) {
  // user_id/user_email são preenchidos por trigger no banco (audit_fill).
  try {
    await ex().from("audit_log").insert({
      action: p.action,
      entity: p.entity,
      entity_id: p.entity_id ?? null,
      description: p.description ?? null,
    });
  } catch {
    /* auditoria é best-effort */
  }
}

export type LoadStatus = "rascunho" | "em_carregamento" | "assinado";

export interface LoadingItem {
  id: string;
  destination_id: string;
  loading_id: string;
  code: string | null;
  description: string | null;
  qty_planned: number;
  qty_actual: number | null;
  order_number: string | null;
  invoice: string | null;
  sort_order: number;
}

export interface LoadingDestination {
  id: string;
  loading_id: string;
  city: string;
  uf: string | null;
  sort_order: number;
  items: LoadingItem[];
}

export interface Loading {
  id: string;
  load_number: string | null;
  load_type: string | null;
  empenho: string | null;
  entrega: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  observations: string | null;
  status: LoadStatus;
  signed_by_name: string | null;
  signed_by_id: string | null;
  signed_at: string | null;
  pdf_path: string | null;
  departure_forecast: string | null;
  invoiced: boolean;
  invoiced_at: string | null;
  invoiced_by_name: string | null;
  invoiced_by_id: string | null;
  created_by: string | null;
  created_at: string;
  destinations: LoadingDestination[];
}

export interface LoadingListItem {
  id: string;
  load_number: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  start_date: string | null;
  status: LoadStatus;
  departure_forecast: string | null;
  invoiced: boolean;
  created_at: string;
  cities: string[];
  total_planned: number;
  total_actual: number;
  items_count: number;
}

export interface ItemInput {
  code?: string;
  description?: string;
  qty_planned?: number;
  order_number?: string;
  invoice?: string;
}
export interface DestinationInput {
  city: string;
  uf?: string | null;
  items: ItemInput[];
}
export interface LoadingInput {
  load_number?: string;
  load_type?: string;
  empenho?: string;
  entrega?: string;
  driver_name?: string;
  vehicle_plate?: string;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string;
  end_time?: string;
  departure_forecast?: string;
  observations?: string;
  destinations: DestinationInput[];
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function headerFromInput(input: LoadingInput) {
  return {
    load_number: input.load_number?.trim() || null,
    load_type: input.load_type?.trim() || null,
    empenho: input.empenho?.trim() || null,
    entrega: input.entrega?.trim() || null,
    driver_name: input.driver_name?.trim() || null,
    vehicle_plate: input.vehicle_plate?.trim().toUpperCase() || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    start_time: input.start_time?.trim() || null,
    end_time: input.end_time?.trim() || null,
    departure_forecast: input.departure_forecast?.trim() || null,
    observations: input.observations?.trim() || null,
  };
}

async function insertDestinations(loadingId: string, destinations: DestinationInput[]) {
  for (let i = 0; i < destinations.length; i++) {
    const d = destinations[i];
    const { data: dest, error: derr } = await ex()
      .from("loading_destinations")
      .insert({ loading_id: loadingId, city: d.city.trim(), uf: d.uf?.trim() || null, sort_order: i })
      .select("id")
      .single();
    if (derr) throw derr;
    const items = (d.items ?? []).filter((it) => it.code || it.description || it.qty_planned);
    if (items.length === 0) continue;
    const rows = items.map((it, j) => ({
      destination_id: dest.id,
      loading_id: loadingId,
      code: it.code?.trim() || null,
      description: it.description?.trim() || null,
      qty_planned: n(it.qty_planned),
      qty_actual: null,
      order_number: it.order_number?.trim() || null,
      invoice: it.invoice?.trim() || null,
      sort_order: j,
    }));
    const { error: ierr } = await ex().from("loading_items").insert(rows);
    if (ierr) throw ierr;
  }
}

export async function createLoading(input: LoadingInput): Promise<string> {
  const { data: loading, error } = await ex().from("loadings").insert(headerFromInput(input)).select("id").single();
  if (error) throw error;
  await insertDestinations(loading.id, input.destinations ?? []);
  await logExp({
    action: "create",
    entity: "loading",
    entity_id: loading.id,
    description: `Criou carga ${input.load_number ?? ""} (${input.driver_name ?? "-"} / ${input.vehicle_plate ?? "-"})`,
  });
  return loading.id;
}

export async function updateLoading(id: string, input: LoadingInput): Promise<void> {
  const { error } = await ex().from("loadings").update(headerFromInput(input)).eq("id", id);
  if (error) throw error;
  await ex().from("loading_destinations").delete().eq("loading_id", id);
  await insertDestinations(id, input.destinations ?? []);
  await logExp({ action: "update", entity: "loading", entity_id: id, description: `Editou carga ${input.load_number ?? ""}` });
}

export async function deleteLoading(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await ex().from("loadings").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  await logExp({ action: "delete", entity: "loading", entity_id: id, description: "Excluiu carga" });
  return { success: true };
}

function mapLoading(l: any, dests: any[], items: any[]): Loading {
  const itemsByDest = new Map<string, LoadingItem[]>();
  for (const it of items) {
    const arr = itemsByDest.get(it.destination_id) ?? [];
    arr.push({
      id: it.id,
      destination_id: it.destination_id,
      loading_id: it.loading_id,
      code: it.code,
      description: it.description,
      qty_planned: n(it.qty_planned),
      qty_actual: it.qty_actual === null || it.qty_actual === undefined ? null : n(it.qty_actual),
      order_number: it.order_number,
      invoice: it.invoice,
      sort_order: it.sort_order ?? 0,
    });
    itemsByDest.set(it.destination_id, arr);
  }
  const destinations: LoadingDestination[] = dests
    .map((d) => ({
      id: d.id,
      loading_id: d.loading_id,
      city: d.city,
      uf: d.uf,
      sort_order: d.sort_order ?? 0,
      items: (itemsByDest.get(d.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: l.id,
    load_number: l.load_number,
    load_type: l.load_type,
    empenho: l.empenho,
    entrega: l.entrega,
    driver_name: l.driver_name,
    vehicle_plate: l.vehicle_plate,
    start_date: l.start_date,
    end_date: l.end_date,
    start_time: l.start_time,
    end_time: l.end_time,
    observations: l.observations,
    status: l.status as LoadStatus,
    signed_by_name: l.signed_by_name,
    signed_by_id: l.signed_by_id,
    signed_at: l.signed_at,
    pdf_path: l.pdf_path,
    departure_forecast: l.departure_forecast ?? null,
    invoiced: !!l.invoiced,
    invoiced_at: l.invoiced_at ?? null,
    invoiced_by_name: l.invoiced_by_name ?? null,
    invoiced_by_id: l.invoiced_by_id ?? null,
    created_by: l.created_by,
    created_at: l.created_at,
    destinations,
  };
}

export async function getLoading(id: string): Promise<Loading | undefined> {
  const { data: l, error } = await ex().from("loadings").select("*").eq("id", id).single();
  if (error || !l) return undefined;
  const [{ data: dests }, { data: items }] = await Promise.all([
    ex().from("loading_destinations").select("*").eq("loading_id", id).order("sort_order"),
    ex().from("loading_items").select("*").eq("loading_id", id).order("sort_order"),
  ]);
  return mapLoading(l, dests ?? [], items ?? []);
}

export async function getLoadings(): Promise<LoadingListItem[]> {
  const { data, error } = await ex().rpc("list_loadings");
  if (error) throw error;
  return ((data ?? []) as any[]).map((l) => ({
    id: l.id,
    load_number: l.load_number,
    driver_name: l.driver_name,
    vehicle_plate: l.vehicle_plate,
    start_date: l.start_date,
    status: l.status as LoadStatus,
    departure_forecast: l.departure_forecast ?? null,
    invoiced: !!l.invoiced,
    created_at: l.created_at,
    cities: (l.cities ?? []) as string[],
    total_planned: n(l.total_planned),
    total_actual: n(l.total_actual),
    items_count: n(l.items_count),
  }));
}

export async function saveActuals(
  loadingId: string,
  updates: { id: string; qty_actual: number | null; invoice: string | null }[],
): Promise<{ success: boolean; error?: string }> {
  for (const u of updates) {
    const { error } = await ex()
      .from("loading_items")
      .update({ qty_actual: u.qty_actual, invoice: u.invoice?.trim() || null })
      .eq("id", u.id);
    if (error) return { success: false, error: error.message };
  }
  await ex().from("loadings").update({ status: "em_carregamento" }).eq("id", loadingId).eq("status", "rascunho");
  await logExp({ action: "update", entity: "loading", entity_id: loadingId, description: "Atualizou quantidades carregadas" });
  return { success: true };
}

export async function updateObservations(loadingId: string, observations: string): Promise<void> {
  await ex().from("loadings").update({ observations: observations.trim() || null }).eq("id", loadingId);
}

export async function signLoading(loadingId: string, signerName: string): Promise<{ success: boolean; error?: string }> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { error } = await ex()
    .from("loadings")
    .update({ status: "assinado", signed_by_name: signerName.trim(), signed_by_id: uid, signed_at: new Date().toISOString() })
    .eq("id", loadingId);
  if (error) return { success: false, error: error.message };
  await logExp({ action: "sign", entity: "loading", entity_id: loadingId, description: `Assinou a carga (${signerName})` });
  return { success: true };
}

export async function setInvoiced(loadingId: string, invoiced: boolean, name: string): Promise<{ success: boolean; error?: string }> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const patch = invoiced
    ? { invoiced: true, invoiced_at: new Date().toISOString(), invoiced_by_name: name.trim() || null, invoiced_by_id: uid }
    : { invoiced: false, invoiced_at: null, invoiced_by_name: null, invoiced_by_id: null };
  const { error } = await ex().from("loadings").update(patch).eq("id", loadingId);
  if (error) return { success: false, error: error.message };
  await logExp({
    action: invoiced ? "invoice" : "uninvoice",
    entity: "loading",
    entity_id: loadingId,
    description: invoiced ? `NF marcada como emitida (${name})` : "NF desmarcada",
  });
  return { success: true };
}

export async function uploadLoadingPdf(loadingId: string, blob: Blob): Promise<string | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return null;
  const path = `${uid}/${loadingId}.pdf`;
  const { error } = await supabase.storage.from("loading-records").upload(path, blob, { upsert: true, contentType: "application/pdf" });
  if (error) {
    console.warn("[upload pdf]", error.message);
    return null;
  }
  await ex().from("loadings").update({ pdf_path: path }).eq("id", loadingId);
  return path;
}

export function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export const STATUS_LABEL: Record<LoadStatus, string> = {
  rascunho: "Rascunho",
  em_carregamento: "Em carregamento",
  assinado: "Assinado",
};
