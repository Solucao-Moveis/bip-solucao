import { supabase } from "@/integrations/supabase/client";

// Formatação compartilhada (tela e impressão)
export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "—";
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export const STATUS_LABEL: Record<string, string> = {
  completed: "Finalizado",
  in_progress: "Em andamento",
  pending: "Pendente",
  cancelled: "Cancelado",
};

// Relatório gerencial de separação por período.
// "Dia" = Data do Carregamento (loading_date). Início/fim de cada carregamento
// e do período são derivados dos horários dos bipes (scanned_codes.scanned_at).
// A quebra por operador vem do log de auditoria (action = "scan_add").

export interface GerencialItem {
  package_label: string | null;
  productName: string;
  productCode: string;
  city: string | null;
  pacotes: number;
  unidades: number;
  /** Und/pacote; null quando itens juntados tinham valores diferentes. */
  unitsPerPackage: number | null;
}

export interface GerencialProductAgg {
  key: string;
  name: string;
  code: string;
  orders: number;
  pacotes: number;
  unidades: number;
}

export interface GerencialOrderRow {
  id: string;
  order_number: string;
  loading_date: string;
  driver: string;
  vehicle_plate: string;
  city: string | null;
  status: string;
  quantity: number;
  scanned: number;
  start: string | null;
  end: string | null;
  products: string;
  items: GerencialItem[];
}

export interface GerencialOperatorRow {
  email: string;
  scans: number;
  start: string | null;
  end: string | null;
}

export interface SeparationReport {
  from: string;
  to: string;
  orders: GerencialOrderRow[];
  operators: GerencialOperatorRow[];
  products: GerencialProductAgg[];
  totalOrders: number;
  totalScanned: number;
  totalExpected: number;
  periodStart: string | null;
  periodEnd: string | null;
}

const EMPTY = (from: string, to: string): SeparationReport => ({
  from, to, orders: [], operators: [], products: [], totalOrders: 0, totalScanned: 0, totalExpected: 0, periodStart: null, periodEnd: null,
});

export async function getSeparationReport(from: string, to: string): Promise<SeparationReport> {
  const { data: ordersData, error } = await supabase
    .from("loading_orders")
    .select("id, order_number, loading_date, driver, vehicle_plate, city, status, quantity")
    .gte("loading_date", from)
    .lte("loading_date", to)
    .order("loading_date")
    .order("created_at");
  if (error) throw error;
  const orders = ordersData ?? [];
  if (orders.length === 0) return EMPTY(from, to);

  const ids = orders.map((o) => o.id);
  const [scansRes, itemsRes, auditRes] = await Promise.all([
    supabase.from("scanned_codes").select("order_id, scanned_at").in("order_id", ids),
    supabase
      .from("loading_order_items")
      .select("order_id, quantity, units_per_package, package_label, city, product_id, products(name, code)")
      .in("order_id", ids)
      .order("created_at"),
    supabase.from("audit_log").select("user_email, created_at").eq("action", "scan_add").in("entity_id", ids),
  ]);

  // Bipes por carregamento (para início/fim/contagem)
  const scansByOrder = new Map<string, string[]>();
  for (const s of (scansRes.data ?? []) as any[]) {
    const arr = scansByOrder.get(s.order_id);
    if (arr) arr.push(s.scanned_at);
    else scansByOrder.set(s.order_id, [s.scanned_at]);
  }

  // Itens por carregamento (juntando o mesmo produto/pacote/cidade) + agregação por produto no período
  const itemsByOrder = new Map<string, GerencialItem[]>();
  const itemIndex = new Map<string, GerencialItem>();
  const prodByOrder = new Map<string, Set<string>>();
  const prodAgg = new Map<string, { name: string; code: string; pacotes: number; unidades: number; orders: Set<string> }>();
  for (const it of (itemsRes.data ?? []) as any[]) {
    const name = it.products?.name ?? "Produto";
    const code = it.products?.code ?? "—";
    const qty = it.quantity ?? 0;
    const upp = it.units_per_package ?? 1;
    const prodKey = it.product_id ?? code;

    // Junta linhas idênticas (mesmo pacote + produto + cidade) dentro do carregamento
    const itemKey = `${it.order_id}|${it.package_label ?? ""}|${prodKey}|${it.city ?? ""}`;
    const existing = itemIndex.get(itemKey);
    if (existing) {
      existing.pacotes += qty;
      existing.unidades += qty * upp;
      if (existing.unitsPerPackage !== null && existing.unitsPerPackage !== upp) existing.unitsPerPackage = null;
    } else {
      const item: GerencialItem = {
        package_label: it.package_label ?? null,
        productName: name,
        productCode: code,
        city: it.city ?? null,
        pacotes: qty,
        unidades: qty * upp,
        unitsPerPackage: upp,
      };
      itemIndex.set(itemKey, item);
      const arr = itemsByOrder.get(it.order_id);
      if (arr) arr.push(item);
      else itemsByOrder.set(it.order_id, [item]);
    }

    const set = prodByOrder.get(it.order_id);
    if (set) set.add(name);
    else prodByOrder.set(it.order_id, new Set([name]));

    const agg = prodAgg.get(prodKey);
    if (agg) {
      agg.pacotes += qty;
      agg.unidades += qty * upp;
      agg.orders.add(it.order_id);
    } else {
      prodAgg.set(prodKey, { name, code, pacotes: qty, unidades: qty * upp, orders: new Set([it.order_id]) });
    }
  }

  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let totalScanned = 0;

  const orderRows: GerencialOrderRow[] = orders.map((o) => {
    const ss = (scansByOrder.get(o.id) ?? []).slice().sort();
    const start = ss[0] ?? null;
    const end = ss.length ? ss[ss.length - 1] : null;
    totalScanned += ss.length;
    if (start && (!periodStart || start < periodStart)) periodStart = start;
    if (end && (!periodEnd || end > periodEnd)) periodEnd = end;
    return {
      id: o.id,
      order_number: o.order_number,
      loading_date: o.loading_date,
      driver: o.driver,
      vehicle_plate: o.vehicle_plate,
      city: o.city ?? null,
      status: o.status,
      quantity: o.quantity,
      scanned: ss.length,
      start,
      end,
      products: Array.from(prodByOrder.get(o.id) ?? []).join(", ") || "—",
      items: itemsByOrder.get(o.id) ?? [],
    };
  });

  const products: GerencialProductAgg[] = Array.from(prodAgg.entries())
    .map(([key, v]) => ({ key, name: v.name, code: v.code, orders: v.orders.size, pacotes: v.pacotes, unidades: v.unidades }))
    .sort((a, b) => b.pacotes - a.pacotes);

  // Quebra por operador (a partir do audit_log)
  const opMap = new Map<string, { scans: number; start: string; end: string }>();
  for (const a of (auditRes.data ?? []) as any[]) {
    const email = a.user_email ?? "—";
    const t = a.created_at as string;
    const cur = opMap.get(email);
    if (!cur) opMap.set(email, { scans: 1, start: t, end: t });
    else {
      cur.scans++;
      if (t < cur.start) cur.start = t;
      if (t > cur.end) cur.end = t;
    }
  }
  const operators: GerencialOperatorRow[] = Array.from(opMap.entries())
    .map(([email, v]) => ({ email, scans: v.scans, start: v.start, end: v.end }))
    .sort((a, b) => b.scans - a.scans);

  const totalExpected = orders.reduce((s, o) => s + (o.quantity ?? 0), 0);

  return {
    from, to,
    orders: orderRows,
    operators,
    products,
    totalOrders: orders.length,
    totalScanned,
    totalExpected,
    periodStart,
    periodEnd,
  };
}
