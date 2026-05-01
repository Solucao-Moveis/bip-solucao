export interface LoadingOrder {
  id: string;
  productType: string;
  quantity: number;
  driver: string;
  vehiclePlate: string;
  loadingDate: string;
  observations: string;
  status: "pending" | "in_progress" | "completed";
  scannedCodes: string[];
  createdAt: string;
}

const STORAGE_KEY = "loading-orders";

export function getOrders(): LoadingOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: LoadingOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function createOrder(data: Omit<LoadingOrder, "id" | "status" | "scannedCodes" | "createdAt">): LoadingOrder {
  const order: LoadingOrder = {
    ...data,
    id: crypto.randomUUID(),
    status: "pending",
    scannedCodes: [],
    createdAt: new Date().toISOString(),
  };
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
  return order;
}

export function getOrder(id: string): LoadingOrder | undefined {
  return getOrders().find((o) => o.id === id);
}

export function updateOrder(id: string, updates: Partial<LoadingOrder>) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], ...updates };
    saveOrders(orders);
  }
}

export function addScannedCode(id: string, code: string): { success: boolean; error?: string } {
  const order = getOrder(id);
  if (!order) return { success: false, error: "Pedido não encontrado" };
  if (order.status === "completed") return { success: false, error: "Carregamento já finalizado" };
  if (order.scannedCodes.includes(code)) return { success: false, error: "Código já bipado anteriormente" };
  if (order.scannedCodes.length >= order.quantity) return { success: false, error: "Quantidade máxima atingida" };

  const newCodes = [...order.scannedCodes, code];
  const newStatus = newCodes.length === order.quantity ? "completed" : "in_progress";
  updateOrder(id, { scannedCodes: newCodes, status: newStatus });
  return { success: true };
}
