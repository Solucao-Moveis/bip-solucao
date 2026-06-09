import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OrderForm } from "@/components/OrderForm";
import { getOrders, cancelOrder, type LoadingOrder } from "@/lib/loading-store";
import { setViewMode } from "@/lib/view-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Hash, Plus, X, ChevronRight, ScanBarcode, Home, Trash2, ClipboardList } from "lucide-react";
import { useExpedicao } from "@/hooks/useExpedicao";
import logo from "@/assets/logo-solucao-moveis.png";

// Hub central (botão "Voltar ao ERP")
const ERP_URL = "https://solucaomoveis-erp.h5xdag.easypanel.host/";

export const Route = createFileRoute("/apontar")({
  head: () => ({
    meta: [
      { title: "Apontamento — Expedição" },
      { name: "description", content: "Modo celular: criar e bipar carregamentos" },
    ],
  }),
  component: ApontarPage,
});

function ApontarPage() {
  const { isMember: isExpedicao } = useExpedicao();
  const [orders, setOrders] = useState<LoadingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => getOrders().then((o) => { setOrders(o); setLoading(false); });

  const handleDelete = async (e: React.MouseEvent, order: LoadingOrder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Apagar o carregamento ${order.order_number}? Os códigos já bipados serão removidos.`)) return;
    const r = await cancelOrder(order.id);
    if (r.success) load();
    else alert(r.error || "Erro ao apagar");
  };

  useEffect(() => {
    setViewMode("mobile");
    load();
  }, []);

  const active = orders.filter((o) => o.status !== "completed");

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho enxuto, fixo no topo */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
        <img src={logo} alt="Solução Móveis" className="h-8 w-8 rounded-md bg-white object-contain" />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Apontamento</p>
          <p className="text-[11px] text-muted-foreground">Gestor de Expedição</p>
        </div>
        <a href={ERP_URL} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4" />ERP
        </a>
      </header>

      <main className="mx-auto w-full max-w-2xl px-3 py-4 space-y-4">
        {/* Criar carregamento */}
        {showForm ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 mr-1" />Fechar
              </Button>
            </div>
            <OrderForm />
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="h-5 w-5 mr-2" />Novo carregamento
          </Button>
        )}

        {isExpedicao && (
          <Link to="/cargas">
            <Button variant="outline" className="w-full"><ClipboardList className="h-4 w-4 mr-2" />Registro de Carregamento</Button>
          </Link>
        )}

        {/* Carregamentos a bipar */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2 pt-1">
            <ScanBarcode className="h-4 w-4 text-primary" />
            Carregamentos a bipar
          </h2>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum carregamento ativo. Toque em “Novo carregamento” para começar.
            </p>
          ) : (
            active.map((order) => {
              const progress = order.quantity > 0
                ? Math.round((order.scannedCodes.length / order.quantity) * 100)
                : 0;
              const produtos = order.items.length > 0
                ? order.items.map((i) => i.product?.name ?? "Produto").join(", ")
                : order.product?.name ?? "Produto";
              return (
                <Link key={order.id} to="/loading/$orderId" params={{ orderId: order.id }}>
                  <Card className="active:scale-[0.99] transition-transform">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm flex items-center gap-1 truncate">
                            <Hash className="h-3 w-3 shrink-0" />{order.order_number} — {produtos}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{order.driver} · {order.vehiclePlate}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">
                            {order.scannedCodes.length}/{order.quantity}
                          </span>
                          <Badge variant="secondary">{progress}%</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, order)}
                          aria-label="Apagar carregamento"
                          className="shrink-0 rounded-md p-2 text-destructive hover:bg-destructive/10 active:bg-destructive/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
