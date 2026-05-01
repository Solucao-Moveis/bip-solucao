import { supabase } from "@/integrations/supabase/client";

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
  product?: Product;
}

export interface LoadingOrder {
  id: string;
  order_number: string;
  product_id: string;
  quantity: number;
  driver: string;
  vehiclePlate: string;
  loadingDate: string;
  observations: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  scannedCodes: string[];
  product?: Product;
  items: OrderItem[];
}

// Products
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createProduct(product: { name: string; code: string; description?: string }) {
  const { data, error } = await supabase
    .from("products")
    .insert({ name: product.name, code: product.code, description: product.description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from("loading_order_items")
    .select("*, products(*)")
    .eq("order_id", orderId);
  if (error) return [];
  return (data ?? []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    product: item.products as Product | undefined,
  }));
}

function mapOrder(o: any, codes: string[], items: OrderItem[]): LoadingOrder {
  const totalQuantity = items.length > 0
    ? items.reduce((sum, i) => sum + i.quantity, 0)
    : o.quantity;

  return {
    id: o.id,
    order_number: o.order_number,
    product_id: o.product_id,
    quantity: totalQuantity,
    driver: o.driver,
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

// Orders
export async function getOrders(): Promise<LoadingOrder[]> {
  const { data: orders, error } = await supabase
    .from("loading_orders")
    .select("*, products(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const result: LoadingOrder[] = [];
  for (const o of orders ?? []) {
    const { data: codes } = await supabase
      .from("scanned_codes")
      .select("barcode")
      .eq("order_id", o.id)
      .order("scanned_at");

    const items = await fetchOrderItems(o.id);
    result.push(mapOrder(o, (codes ?? []).map((c) => c.barcode), items));
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

  const { data: codes } = await supabase
    .from("scanned_codes")
    .select("barcode")
    .eq("order_id", o.id)
    .order("scanned_at");

  const items = await fetchOrderItems(o.id);
  return mapOrder(o, (codes ?? []).map((c) => c.barcode), items);
}

export async function createOrder(data: {
  orderNumber: string;
  items: { productId: string; quantity: number }[];
  driver: string;
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
      vehicle_plate: data.vehiclePlate.toUpperCase(),
      loading_date: data.loadingDate,
      observations: data.observations || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Insert items
  const itemsToInsert = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
  }));

  await supabase.from("loading_order_items").insert(itemsToInsert);

  const items = await fetchOrderItems(order.id);

  return {
    id: order.id,
    order_number: order.order_number,
    product_id: order.product_id,
    quantity: totalQuantity,
    driver: order.driver,
    vehiclePlate: order.vehicle_plate,
    loadingDate: order.loading_date,
    observations: order.observations,
    status: order.status as LoadingOrder["status"],
    createdAt: order.created_at,
    scannedCodes: [],
    items,
  };
}

export async function addScannedCode(
  orderId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { success: false, error: "Pedido não encontrado" };
  if (order.status === "completed") return { success: false, error: "Carregamento já finalizado" };
  if (order.scannedCodes.length >= order.quantity) return { success: false, error: "Quantidade máxima atingida" };

  const { error } = await supabase
    .from("scanned_codes")
    .insert({ order_id: orderId, barcode: code });
  if (error) {
    if (error.code === "23505") return { success: false, error: "Código duplicado no banco" };
    return { success: false, error: error.message };
  }

  const newCount = order.scannedCodes.length + 1;
  const newStatus = newCount === order.quantity ? "completed" : "in_progress";
  await supabase
    .from("loading_orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  return { success: true };
}

export async function finishOrderEarly(orderId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { success: false, error: "Pedido não encontrado" };
  if (order.status === "completed") return { success: false, error: "Carregamento já finalizado" };

  const { error } = await supabase
    .from("loading_orders")
    .update({ status: "completed", observations: order.observations ? `${order.observations}\n\nFinalizado antecipadamente: ${reason}` : `Finalizado antecipadamente: ${reason}` })
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

  return { success: true };
}
