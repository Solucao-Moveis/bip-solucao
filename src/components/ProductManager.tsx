import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getProducts, createProduct, updateProduct, deleteProduct, type Product } from "@/lib/loading-store";
import { Plus, Package, Tag, Barcode, Pencil, Trash2, X, Check } from "lucide-react";
import { BarcodeLabel } from "./BarcodeLabel";

export function ProductManager({ bare = false }: { bare?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", code: "", description: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, code: p.code, description: p.description ?? "" });
    setConfirmDeleteId(null);
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name || !editForm.code) return;
    setLoading(true);
    try {
      await updateProduct(id, editForm);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteProduct(id);
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={bare ? "w-full border-0 shadow-none" : "w-full max-w-2xl mx-auto"}>
      <CardHeader>
        <div className={`flex items-center justify-between ${bare ? "pr-8" : ""}`}>
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
                <Input id="pName" placeholder="Ex: Guarda-roupa" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pCode">Código</Label>
                <Input id="pCode" placeholder="Ex: GR-001" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
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
              <div key={p.id}>
                {editingId === p.id ? (
                  <div className="border rounded-lg p-3 space-y-2 bg-secondary/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input placeholder="Nome" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                      <Input placeholder="Código" value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} />
                    </div>
                    <Input placeholder="Descrição" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                      <Button size="sm" onClick={() => handleUpdate(p.id)} disabled={loading}><Check className="h-4 w-4 mr-1" />Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/50">
                    <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.code}{p.description ? ` · ${p.description}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(p)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={loading}>Confirmar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setConfirmDeleteId(p.id); setEditingId(null); }} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)} title="Ver código de barras">
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {selectedProduct?.id === p.id && editingId !== p.id && (
                  <div className="mt-2 ml-7">
                    <BarcodeLabel product={p} onClose={() => setSelectedProduct(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
