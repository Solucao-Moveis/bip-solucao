import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getProducts, updateOrder, type LoadingOrder, type Product } from "@/lib/loading-store";
import { Plus, Trash2, MapPin } from "lucide-react";

interface ItemInput {
  productId: string;
  quantity: string;
  unitsPerPackage: string;
  packageLabel: string;
  city: string;
}

const nextLabel = (i: number) => `Pacote ${String.fromCharCode(65 + (i % 26))}`;

export function EditOrderDialog({
  order,
  open,
  onOpenChange,
  onSaved,
}: {
  order: LoadingOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    orderNumber: order.order_number,
    driver: order.driver,
    city: order.city ?? "",
    vehiclePlate: order.vehiclePlate,
    loadingDate: order.loadingDate,
    observations: order.observations ?? "",
  });
  const [items, setItems] = useState<ItemInput[]>(
    order.items.length
      ? order.items.map((i) => ({
          productId: i.product_id,
          quantity: String(i.quantity),
          unitsPerPackage: String(i.units_per_package),
          packageLabel: i.package_label ?? "",
          city: i.city ?? "",
        }))
      : [{ productId: "", quantity: "", unitsPerPackage: "1", packageLabel: nextLabel(0), city: "" }],
  );

  useEffect(() => {
    if (open) getProducts().then(setProducts);
  }, [open]);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const updateItem = (index: number, field: keyof ItemInput, value: string) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", quantity: "", unitsPerPackage: "1", packageLabel: nextLabel(prev.length), city: "" }]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    const parsed = items
      .filter((i) => i.productId && i.quantity)
      .map((i) => ({
        productId: i.productId,
        quantity: parseInt(i.quantity, 10),
        unitsPerPackage: parseInt(i.unitsPerPackage, 10) || 1,
        packageLabel: i.packageLabel.trim() || null,
        city: i.city.trim() || null,
      }))
      .filter((i) => i.quantity > 0);

    if (!form.orderNumber || !form.driver || !form.vehiclePlate || !form.loadingDate || parsed.length === 0) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    const totalRequested = parsed.reduce((sum, i) => sum + i.quantity, 0);
    if (totalRequested < order.scannedCodes.length) {
      setError(`Já foram bipados ${order.scannedCodes.length} pacotes. A quantidade total não pode ser menor.`);
      return;
    }

    setSaving(true);
    const result = await updateOrder(order.id, {
      orderNumber: form.orderNumber,
      driver: form.driver,
      city: form.city,
      vehiclePlate: form.vehiclePlate,
      loadingDate: form.loadingDate,
      observations: form.observations,
      items: parsed,
    });
    setSaving(false);
    if (result.success) {
      onSaved();
      onOpenChange(false);
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Carregamento</DialogTitle>
          <DialogDescription>Altere os dados do pedido. Itens já bipados serão preservados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Número do Pedido</Label>
              <Input value={form.orderNumber} onChange={(e) => update("orderNumber", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Motorista</Label>
              <Input value={form.driver} onChange={(e) => update("driver", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Placa</Label>
              <Input value={form.vehiclePlate} onChange={(e) => update("vehiclePlate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={form.loadingDate} onChange={(e) => update("loadingDate", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos / Pacotes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="space-y-2 border rounded-md p-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(index, "productId", e.target.value)}
                    className="col-span-12 md:col-span-4 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Selecione</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                  <Input className="col-span-6 md:col-span-3" placeholder="Pacote A" value={item.packageLabel} onChange={(e) => updateItem(index, "packageLabel", e.target.value)} />
                  <Input className="col-span-3 md:col-span-2" type="number" min="1" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                  <Input className="col-span-2 md:col-span-2" type="number" min="1" placeholder="Und" value={item.unitsPerPackage} onChange={(e) => updateItem(index, "unitsPerPackage", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" className="col-span-1 h-9 w-9" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input placeholder="Cidade de entrega deste produto" value={item.city} onChange={(e) => updateItem(index, "city", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observations} onChange={(e) => update("observations", e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
