import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createOrder, getProducts, type Product } from "@/lib/loading-store";
import { Truck, Package, User, Calendar, FileText, Hash } from "lucide-react";

export function OrderForm() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    orderNumber: "",
    productId: "",
    quantity: "",
    driver: "",
    vehiclePlate: "",
    loadingDate: "",
    observations: "",
  });

  useEffect(() => {
    setMounted(true);
    setForm((f) => ({ ...f, loadingDate: new Date().toISOString().split("T")[0] }));
    getProducts().then(setProducts);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantity, 10);
    if (!form.orderNumber || !form.productId || !qty || !form.driver || !form.vehiclePlate || !form.loadingDate) return;

    setLoading(true);
    try {
      const order = await createOrder({
        orderNumber: form.orderNumber,
        productId: form.productId,
        quantity: qty,
        driver: form.driver,
        vehiclePlate: form.vehiclePlate,
        loadingDate: form.loadingDate,
        observations: form.observations,
      });
      navigate({ to: "/loading/$orderId", params: { orderId: order.id } });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Novo Carregamento</CardTitle>
            <CardDescription>Preencha as informações do pedido para iniciar</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber" className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Número do Pedido
              </Label>
              <Input id="orderNumber" placeholder="Ex: PED-001" required value={form.orderNumber} onChange={(e) => update("orderNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productId" className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                Produto
              </Label>
              <select
                id="productId"
                required
                value={form.productId}
                onChange={(e) => update("productId", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
              >
                <option value="">Selecione o produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity" className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                Quantidade de Pacotes
              </Label>
              <Input id="quantity" type="number" min="1" placeholder="Ex: 150" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Motorista
              </Label>
              <Input id="driver" placeholder="Nome do motorista" required value={form.driver} onChange={(e) => update("driver", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate" className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                Placa do Veículo
              </Label>
              <Input id="vehiclePlate" placeholder="Ex: ABC-1234" required value={form.vehiclePlate} onChange={(e) => update("vehiclePlate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loadingDate" className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Data do Carregamento
              </Label>
              <Input id="loadingDate" type="date" required value={form.loadingDate} onChange={(e) => update("loadingDate", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observations" className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Observações
            </Label>
            <Textarea id="observations" placeholder="Informações adicionais sobre o carregamento..." rows={3} value={form.observations} onChange={(e) => update("observations", e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Iniciar Carregamento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
