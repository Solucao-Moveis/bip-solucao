import { createFileRoute } from "@tanstack/react-router";
import { OrderForm } from "@/components/OrderForm";
import { ProductManager } from "@/components/ProductManager";
import { LoadingTracker } from "@/components/LoadingTracker";
import { getOrders, cancelOrder, formatDateBR, type LoadingOrder } from "@/lib/loading-store";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Package, Clock, CheckCircle2, Hash, XCircle, Plus, Tag, Truck, User, MapPin, Calendar } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { setViewMode } from "@/lib/view-mode";

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
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"data-desc" | "data-asc" | "qtd-desc" | "qtd-asc">("data-desc");

  const closeTracker = () => { setSelectedId(null); loadOrders(); };

  const sortFn = (a: LoadingOrder, b: LoadingOrder) => {
    switch (sortBy) {
      case "data-asc": return a.loadingDate.localeCompare(b.loadingDate);
      case "data-desc": return b.loadingDate.localeCompare(a.loadingDate);
      case "qtd-asc": return a.quantity - b.quantity;
      case "qtd-desc": return b.quantity - a.quantity;
      default: return 0;
    }
  };

  const loadOrders = () => getOrders().then((o) => { setOrders(o); setLoading(false); });

  useEffect(() => {
    setViewMode("desktop");
    loadOrders();
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "completed").sort(sortFn);
  const completedOrders = orders.filter((o) => o.status === "completed").sort(sortFn);

  return (
    <AppLayout pageTitle="Carregamentos">
      <div className="space-y-8">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Carregamentos</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Carregando..."
                : `${activeOrders.length} ativo(s) · ${completedOrders.length} finalizado(s)`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Ordenar carregamentos"
            >
              <option value="data-desc">Data (mais recentes)</option>
              <option value="data-asc">Data (mais antigos)</option>
              <option value="qtd-desc">Quantidade (maior)</option>
              <option value="qtd-asc">Quantidade (menor)</option>
            </select>
            <Button variant="outline" onClick={() => setShowProducts(true)}>
              <Tag className="h-4 w-4 mr-2" />Produtos
            </Button>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-2" />Novo Carregamento
            </Button>
          </div>
        </div>

        {/* Ativos */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Ativos
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : activeOrders.length === 0 ? (
            <EmptyState onNew={() => setShowNew(true)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} onOpen={setSelectedId} onCancel={loadOrders} />
              ))}
            </div>
          )}
        </section>

        {/* Finalizados */}
        {completedOrders.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Finalizados
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {completedOrders.slice(0, 12).map((order) => (
                <OrderCard key={order.id} order={order} onOpen={setSelectedId} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Diálogo: Novo Carregamento */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl p-0 max-h-[88vh] overflow-y-auto border-0 bg-transparent shadow-2xl">
          <DialogTitle className="sr-only">Novo Carregamento</DialogTitle>
          <OrderForm bare />
        </DialogContent>
      </Dialog>

      {/* Diálogo: Produtos */}
      <Dialog open={showProducts} onOpenChange={setShowProducts}>
        <DialogContent className="max-w-2xl p-0 max-h-[88vh] overflow-y-auto border-0 bg-transparent shadow-2xl">
          <DialogTitle className="sr-only">Produtos Cadastrados</DialogTitle>
          <ProductManager bare />
        </DialogContent>
      </Dialog>

      {/* Painel do carregamento (mesma tela, sem trocar de rota) */}
      <Dialog open={!!selectedId} onOpenChange={(o) => { if (!o) closeTracker(); }}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 [&>button]:hidden">
          <DialogTitle className="sr-only">Carregamento</DialogTitle>
          {selectedId && (
            <LoadingTracker key={selectedId} orderId={selectedId} onClose={closeTracker} />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Truck className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum carregamento ativo.</p>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />Novo Carregamento
        </Button>
      </CardContent>
    </Card>
  );
}

function OrderCard({ order, onOpen, onCancel }: { order: LoadingOrder; onOpen: (id: string) => void; onCancel?: () => void }) {
  const progress = order.quantity > 0
    ? Math.round((order.scannedCodes.length / order.quantity) * 100)
    : 0;
  const isActive = order.status !== "completed";
  const produtos = order.items.length > 0
    ? order.items.map((i) => i.product?.name ?? "Produto").join(", ")
    : order.product?.name ?? "Produto";

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja cancelar este carregamento? Todos os códigos bipados serão removidos.")) return;
    const result = await cancelOrder(order.id);
    if (result.success) onCancel?.();
    else alert(result.error || "Erro ao cancelar");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(order.id); } }}
      className="group block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {order.order_number}
              </p>
              {order.loading_number && (
                <p className="mt-0.5 text-xs font-medium text-primary">Carga {order.loading_number}</p>
              )}
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{produtos}</p>
            </div>
            <Badge
              variant={isActive ? "secondary" : "default"}
              className={isActive ? "" : "bg-success text-success-foreground shrink-0"}
            >
              {isActive ? `${progress}%` : "Finalizado"}
            </Badge>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground"><Calendar className="h-3 w-3" />{formatDateBR(order.loadingDate)}</span>
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.driver}</span>
            <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{order.vehiclePlate}</span>
            {order.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{order.city}</span>}
          </div>

          {/* Progresso */}
          <div className="mt-auto space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Package className="h-3 w-3" />Pacotes bipados
              </span>
              <span className="font-medium">{order.scannedCodes.length}/{order.quantity}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Ações */}
          {isActive && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <XCircle className="h-3.5 w-3.5 mr-1" />Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
