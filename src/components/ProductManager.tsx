import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getProducts, createProduct, type Product } from "@/lib/loading-store";
import { Plus, Package, Tag } from "lucide-react";

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const load = async () => {
    setProducts(await getProducts());
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    setLoading(true);
    try {
      await createProduct(form);
      setForm({ name: "", code: "", description: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos Cadastrados
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />{showForm ? "Cancelar" : "Novo Produto"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-secondary/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pName">Nome do Produto</Label>
                <Input id="pName" placeholder="Ex: Caixas de leite" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pCode">Código</Label>
                <Input id="pCode" placeholder="Ex: LEITE-001" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pDesc">Descrição (opcional)</Label>
              <Input id="pDesc" placeholder="Descrição do produto" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Cadastrar Produto"}
            </Button>
          </form>
        )}

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum produto cadastrado. Adicione produtos para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/50">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code}{p.description ? ` · ${p.description}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
