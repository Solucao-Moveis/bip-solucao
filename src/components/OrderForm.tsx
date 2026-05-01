import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrder } from "@/lib/loading-store";
import { Truck, Package, User, Calendar, FileText } from "lucide-react";

export function OrderForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    productType: "",
    quantity: "",
    driver: "",
    vehiclePlate: "",
    loadingDate: new Date().toISOString().split("T")[0],
    observations: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantity, 10);
    if (!form.productType || !qty || !form.driver || !form.vehiclePlate || !form.loadingDate) return;

    const order = createOrder({
      productType: form.productType,
      quantity: qty,
      driver: form.driver,
      vehiclePlate: form.vehiclePlate.toUpperCase(),
      loadingDate: form.loadingDate,
      observations: form.observations,
    });

    navigate({ to: "/loading/$orderId", params: { orderId: order.id } });
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
              <Label htmlFor="productType" className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                Tipo de Produto
              </Label>
              <Input id="productType" placeholder="Ex: Caixas de leite" required value={form.productType} onChange={(e) => update("productType", e.target.value)} />
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
          <Button type="submit" size="lg" className="w-full">
            Iniciar Carregamento
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
