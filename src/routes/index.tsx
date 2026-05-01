import { createFileRoute } from "@tanstack/react-router";
import { OrderForm } from "@/components/OrderForm";
import { ProductManager } from "@/components/ProductManager";
import { getOrders, cancelOrder, type LoadingOrder } from "@/lib/loading-store";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Package, Clock, CheckCircle2, Hash, XCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Carregamento" },
      { name: "description", content: "Sistema de acompanhamento de carregamento de caminhões" },
    ],
  }),
  component: Index,
});

function Index() {
  const [orders, setOrders] = useState<LoadingOrder[]>([]);

  useEffect(() => {
    getOrders().then(setOrders);
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "completed");
  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Controle de Carregamento</h1>
            <p className="text-xs text-muted-foreground">Sistema de rastreamento de pacotes</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <ProductManager />
        <OrderForm />

        {activeOrders.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Carregamentos Ativos
            </h2>
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {completedOrders.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Finalizados
            </h2>
            {completedOrders.slice(0, 5).map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order }: { order: LoadingOrder }) {
  const progress = Math.round((order.scannedCodes.length / order.quantity) * 100);
  return (
    <Link to="/loading/$orderId" params={{ orderId: order.id }}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Hash className="h-3 w-3" />{order.order_number} — {order.product?.name ?? "Produto"}
                </p>
                <p className="text-xs text-muted-foreground">{order.driver} · {order.vehiclePlate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">{order.scannedCodes.length}/{order.quantity}</span>
              <Badge variant={order.status === "completed" ? "default" : "secondary"} className={order.status === "completed" ? "bg-success text-success-foreground" : ""}>
                {order.status === "completed" ? "Finalizado" : `${progress}%`}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
