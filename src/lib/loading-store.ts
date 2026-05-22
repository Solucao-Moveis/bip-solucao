import { supabase } from "@/integrations/supabase/client";
import { logAction } from "./audit";

export interface Product {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  units_per_package: number;
  package_label: string | null;
  city: string | null;
  product?: Product;
}

export interface ScannedCode {
  id: string;
  barcode: string;
  product_id: string | null;
  package_label: string | null;
  item_id: string | null;
  scanned_at: string;
}

export interface LoadingOrder {
  id: string;
  order_number: string;
  product_id: string;
  quantity: number;
  driver: string;
  city: string | null;
  vehiclePlate: string;
  loadingDate: string;
  observations: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  scannedCodes: ScannedCode[];
  product?: Product;
  items: OrderItem[];
}

// Products
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("code");
  if (error) throw error;
  return data ?? [];
}

export async function updateProduct(id: string, product: { name: string; code: string; description?: string }) {
  const { data, error } = await supabase
    .from("products")
    .update({ name: product.name, code: product.code, description: product.description ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logAction({ action: "update", entity: "product", entity_id: id, description: `Editou produto ${product.name} (${product.code})` });
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  await logAction({ action: "delete", entity: "product", entity_id: id, description: `Excluiu produto ${id}` });
}

export async function createProduct(product: { name: string; code: string; description?: string }) {
  const { data, error } = await supabase
    .from("products")
    .insert({ name: product.name, code: product.code, description: product.description ?? null })
    .select()
    .single();
  if (error) throw error;
  await logAction({ action: "create", entity: "product", entity_id: data.id, description: `Cadastrou produto ${product.name} (${product.code})` });
  return data;
}

async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from("loading_order_items")
    .select("*, products(*)")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) return [];
  return (data ?? []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    units_per_package: item.units_per_package ?? 1,
    package_label: item.package_label ?? null,
    city: item.city ?? null,
    product: item.products as Product | undefined,
  }));
}

async function fetchScannedCodes(orderId: string): Promise<ScannedCode[]> {
  const { data, error } = await supabase
    .from("scanned_codes")
    .select("id, barcode, product_id, scanned_at, package_label, item_id")
    .eq("order_id", orderId)
    .order("scanned_at");
  if (error) return [];
  return (data ?? []) as ScannedCode[];
}

function mapOrder(o: any, codes: ScannedCode[], items: OrderItem[]): LoadingOrder {
  const totalQuantity = items.length > 0
    ? items.reduce((sum, i) => sum + i.quantity, 0)
    : o.quantity;
  return {
    id: o.id,
    order_number: o.order_number,
    product_id: o.product_id,
    quantity: totalQuantity,
    driver: o.driver,
    city: o.city ?? null,
    vehiclePlate: o.vehicle_plate,
    loadingDate: o.loading_date,
    observations: o.observations,
    status: o.status as LoadingOrder["status"],
    createdAt: o.created_at,
    scannedCodes: codes,
    product: o.products as unknown as Product,
    items,
  };
}

export async function getOrders(): Promise<LoadingOrder[]> {
  const { data: orders, error } = await supabase
    .from("loading_orders")
    .select("*, products(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const result: LoadingOrder[] = [];
  for (const o of orders ?? []) {
    const codes = await fetchScannedCodes(o.id);
    const items = await fetchOrderItems(o.id);
    result.push(mapOrder(o, codes, items));
  }
  return result;
}

export async function getOrder(id: string): Promise<LoadingOrder | undefined> {
  const { data: o, error } = await supabase
    .from("loading_orders")
    .select("*, products(*)")
    .eq("id", id)
    .single();
  if (error || !o) return undefined;
  const codes = await fetchScannedCodes(o.id);
  const items = await fetchOrderItems(o.id);
  return mapOrder(o, codes, items);
}

export interface OrderItemInputData {
  productId: string;
  quantity: number;
  unitsPerPackage: number;
  packageLabel?: string | null;
  city?: string | null;
}

export async function createOrder(data: {
  orderNumber: string;
  items: OrderItemInputData[];
  driver: string;
  city: string;
  vehiclePlate: string;
  loadingDate: string;
  observations: string;
}): Promise<LoadingOrder> {
  const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);
  const firstProductId = data.items[0]?.productId ?? null;

  const { data: order, error } = await supabase
    .from("loading_orders")
    .insert({
      order_number: data.orderNumber,
      product_id: firstProductId,
      quantity: totalQuantity,
      driver: data.driver,
      city: data.city || null,
      vehicle_plate: data.vehiclePlate.toUpperCase(),
      loading_date: data.loadingDate,
      observations: data.observations || null,
    })
    .select()
    .single();
  if (error) throw error;

  const itemsToInsert = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    units_per_package: item.unitsPerPackage,
    package_label: item.packageLabel || null,
    city: item.city || null,
  })) as never;
  await supabase.from("loading_order_items").insert(itemsToInsert);

  const items = await fetchOrderItems(order.id);
  await logAction({ action: "create", entity: "loading_order", entity_id: order.id, description: `Criou carregamento ${data.orderNumber} (${data.driver} / ${data.vehiclePlate})` });
  return mapOrder(order, [], items);
}

export async function updateOrder(
  orderId: string,
  data: {
    orderNumber: string;
    items: OrderItemInputData[];
    driver: string;
    city: string;
    vehiclePlate: string;
    loadingDate: string;
    observations: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);
  const firstProductId = data.items[0]?.productId ?? null;

  const { error } = await supabase
    .from("loading_orders")
    .update({
      order_number: data.orderNumber,
      product_id: firstProductId,
      quantity: totalQuantity,
      driver: data.driver,
      city: data.city || null,
      vehicle_plate: data.vehiclePlate.toUpperCase(),
      loading_date: data.loadingDate,
      observations: data.observations || null,
    })
    .eq("id", orderId);
  if (error) return { success: false, error: error.message };

  // Replace items
  await supabase.from("loading_order_items").delete().eq("order_id", orderId);
  const itemsToInsert = data.items.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    quantity: item.quantity,
    units_per_package: item.unitsPerPackage,
    package_label: item.packageLabel || null,
    city: item.city || null,
  })) as never;
  if (data.items.length > 0) {
    await supabase.from("loading_order_items").insert(itemsToInsert);
  }
  await logAction({ action: "update", entity: "loading_order", entity_id: orderId, description: `Editou carregamento ${data.orderNumber}` });
  return { success: true };
}

export async function addScannedCode(
  orderId: string,
  code: string,
  selectedItemId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { success: false, error: "Pedido não encontrado" };
  if (order.status === "completed") return { success: false, error: "Carregamento já finalizado" };

  const trimmed = code.trim();

  // Find product matching this barcode
  const { data: prodMatches } = await supabase
    .from("products")
    .select("id, code, name")
    .eq("code", trimmed)
    .limit(1);
  const matchedProduct = prodMatches?.[0];

  let targetItem = selectedItemId ? order.items.find((i) => i.id === selectedItemId) : undefined;

  if (matchedProduct) {
    const productItems = order.items.filter((i) => i.product_id === matchedProduct.id);
    if (productItems.length === 0) {
      return { success: false, error: `Produto "${matchedProduct.name}" não faz parte deste carregamento` };
    }
    // Enforce that selected item matches the bipped product
    if (targetItem && targetItem.product_id !== matchedProduct.id) {
      return { success: false, error: `O pacote selecionado não pertence ao produto "${matchedProduct.name}"` };
    }
    // If product has multiple package types in this order, require selection
    if (!targetItem) {
      if (productItems.length > 1) {
        return { success: false, error: `Selecione qual pacote (${productItems.map((i) => i.package_label || "—").join(", ")}) está sendo bipado` };
      }
      targetItem = productItems[0];
    }
  } else if (!targetItem) {
    // Fallback: enforce total
    if (order.scannedCodes.length >= order.quantity) {
      return { success: false, error: "Quantidade máxima atingida" };
    }
  }

  // Per-item (per-package_label) limit
  if (targetItem) {
    const scannedForItem = order.scannedCodes.filter(
      (s) => s.product_id === targetItem!.product_id && (s.package_label ?? null) === (targetItem!.package_label ?? null)
    ).length;
    if (scannedForItem >= targetItem.quantity) {
      const label = targetItem.package_label ? ` "${targetItem.package_label}"` : "";
      return { success: false, error: `Quantidade máxima atingida para o pacote${label} (${targetItem.quantity})` };
    }
  }

  const { error } = await supabase
    .from("scanned_codes")
    .insert({
      order_id: orderId,
      barcode: trimmed,
      product_id: matchedProduct?.id ?? targetItem?.product_id ?? null,
      package_label: targetItem?.package_label ?? null,
    } as never);
  if (error) {
    if (error.code === "23505") return { success: false, error: "Código duplicado no banco" };
    return { success: false, error: error.message };
  }

  const newCount = order.scannedCodes.length + 1;
  const newStatus = newCount >= order.quantity ? "completed" : "in_progress";
  await supabase.from("loading_orders").update({ status: newStatus }).eq("id", orderId);

  const labelDesc = targetItem?.package_label ? ` [${targetItem.package_label}]` : "";
  await logAction({ action: "scan_add", entity: "scanned_code", entity_id: orderId, description: `Bipou ${trimmed}${matchedProduct ? ` (${matchedProduct.name})` : ""}${labelDesc}` });
  return { success: true };
}

export async function removeScannedCode(scanId: string): Promise<{ success: boolean; error?: string }> {
  const { data: scan } = await supabase
    .from("scanned_codes")
    .select("order_id")
    .eq("id", scanId)
    .single();
  const { error } = await supabase.from("scanned_codes").delete().eq("id", scanId);
  if (error) return { success: false, error: error.message };
  if (scan?.order_id) {
    await supabase.from("loading_orders").update({ status: "in_progress" }).eq("id", scan.order_id);
  }
  await logAction({ action: "scan_remove", entity: "scanned_code", entity_id: scanId, description: `Removeu bipe` });
  return { success: true };
}

export async function finishOrderEarly(orderId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { success: false, error: "Pedido não encontrado" };
  if (order.status === "completed") return { success: false, error: "Carregamento já finalizado" };

  const { error } = await supabase
    .from("loading_orders")
    .update({
      status: "completed",
      observations: order.observations
        ? `${order.observations}\n\nFinalizado antecipadamente: ${reason}`
        : `Finalizado antecipadamente: ${reason}`,
    })
    .eq("id", orderId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { success: false, error: "Pedido não encontrado" };
  if (order.status === "completed") return { success: false, error: "Carregamento já finalizado" };

  await supabase.from("scanned_codes").delete().eq("order_id", orderId);
  await supabase.from("loading_order_items").delete().eq("order_id", orderId);
  await supabase.from("loading_orders").delete().eq("id", orderId);

  await logAction({ action: "delete", entity: "loading_order", entity_id: orderId, description: `Cancelou carregamento ${order.order_number}` });
  return { success: true };
}

// Helpers
export function formatDateBR(isoDate: string): string {
  // isoDate is "YYYY-MM-DD" — parse as local to avoid TZ shift
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export function formatDateTimeBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
