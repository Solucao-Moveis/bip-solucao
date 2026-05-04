import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createOrder, getProducts, type Product } from "@/lib/loading-store";
import { Truck, Package, User, Calendar, FileText, Hash, Plus, Trash2 } from "lucide-react";

interface OrderItemInput {
  productId: string;
  quantity: string;
  unitsPerPackage: string;
}

export function OrderForm() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrderItemInput[]>([{ productId: "", quantity: "", unitsPerPackage: "1" }]);
  const [form, setForm] = useState({
    orderNumber: "",
    driver: "",
    vehiclePlate: "",
    loadingDate: "",
    observations: "",
  });

  useEffect(() => {
    setForm((f) => ({ ...f, loadingDate: new Date().toISOString().split("T")[0] }));
    getProducts().then(setProducts);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedItems = items
      .filter((item) => item.productId && item.quantity)
      .map((item) => ({ productId: item.productId, quantity: parseInt(item.quantity, 10), unitsPerPackage: parseInt(item.unitsPerPackage, 10) || 1 }))
      .filter((item) => item.quantity > 0);

    if (!form.orderNumber || parsedItems.length === 0 || !form.driver || !form.vehiclePlate || !form.loadingDate) return;

    setLoading(true);
    try {
      const order = await createOrder({
        orderNumber: form.orderNumber,
        items: parsedItems,
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

  const updateItem = (index: number, field: keyof OrderItemInput, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { productId: "", quantity: "", unitsPerPackage: "1" }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  const totalProducts = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const upp = parseInt(item.unitsPerPackage, 10) || 1;
    return sum + qty * upp;
  }, 0);

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

          {/* Products section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                Produtos
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />Adicionar Produto
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">Produto</Label>}
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
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
                  <div className="w-28">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">Pacotes</Label>}
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      required
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">Und/Pacote</Label>}
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={item.unitsPerPackage}
                      onChange={(e) => updateItem(index, "unitsPerPackage", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {totalQuantity > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalQuantity} pacotes</span>
                {totalProducts !== totalQuantity && (
                  <span className="ml-2">(<span className="font-semibold text-foreground">{totalProducts} produtos</span>)</span>
                )}
              </p>
            )}
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
