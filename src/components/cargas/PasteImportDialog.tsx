import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ClipboardPaste, Wand2 } from "lucide-react";
import { parseLoadingPaste, type ParsedDestination } from "@/lib/cargas-paste-parser";
import type { DestinationInput } from "@/lib/cargas-store";

function toNum(s: string): number {
  // pt-BR: '.' separa milhar, ',' separa decimal. Ex.: "1.250" -> 1250; "12,5" -> 12.5
  const x = Number(String(s).trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

export function PasteImportDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (destinations: DestinationInput[]) => void;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ParsedDestination[] | null>(null);

  const analyze = () => setPreview(parseLoadingPaste(raw));
  const reset = () => { setRaw(""); setPreview(null); };

  const confirm = () => {
    if (!preview) return;
    const destinations: DestinationInput[] = preview
      .map((d) => ({
        city: d.city.trim(),
        uf: d.uf.trim() || null,
        items: d.items
          .filter((it) => it.code || it.description || it.qty_planned)
          .map((it) => ({
            code: it.code,
            description: it.description,
            qty_planned: toNum(it.qty_planned),
            order_number: it.order_number,
            invoice: it.invoice,
          })),
      }))
      .filter((d) => d.city || d.items.length > 0);
    onConfirm(destinations);
    reset();
    onOpenChange(false);
  };

  const update = (fn: (p: ParsedDestination[]) => void) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const copy = prev.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) }));
      fn(copy);
      return copy;
    });
  };

  const totalItems = preview?.reduce((s, d) => s + d.items.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardPaste className="h-5 w-5" /> Colar itens da carga</DialogTitle>
          <DialogDescription>
            Cole de uma planilha (colunas) ou de um texto. O sistema separa numa prévia que você confere
            antes de inserir. Linhas no formato <b>CIDADE/UF</b> viram destinos.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-3">
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={12}
              placeholder={"ESPERANTINA/TO\n14010191\tCONJ HEXAG INF 6 MESA 6 CAD\t25\t4797\n14010362\tCONJ REF TRIP MASTIC VERDE\t12\t4797\nQUERÊNCIA/MT\n14010203\tCONJ PROF OVAL 1M\t13\t4777"}
              className="font-mono text-xs"
            />
            <div className="flex justify-end">
              <Button onClick={analyze} disabled={!raw.trim()}><Wand2 className="h-4 w-4 mr-2" /> Analisar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{preview.length} destino(s) · {totalItems} item(ns). Confira e edite abaixo.</p>
            {preview.map((d, di) => (
              <div key={di} className="rounded-md border p-3 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Cidade</Label>
                    <Input value={d.city} onChange={(e) => update((p) => { p[di].city = e.target.value; })} placeholder="Cidade" />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">UF</Label>
                    <Input value={d.uf} maxLength={2} onChange={(e) => update((p) => { p[di].uf = e.target.value.toUpperCase(); })} placeholder="UF" />
                  </div>
                  <Button variant="ghost" size="icon" title="Remover destino" onClick={() => update((p) => { p.splice(di, 1); })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {d.items.map((it, ii) => (
                    <div key={ii} className="grid grid-cols-12 gap-2 items-start border-t pt-2">
                      <Input className="col-span-2 h-8 text-xs" value={it.code} placeholder="Código" onChange={(e) => update((p) => { p[di].items[ii].code = e.target.value; })} />
                      <Textarea className="col-span-5 text-xs min-h-[2rem]" rows={1} value={it.description} placeholder="Descrição" onChange={(e) => update((p) => { p[di].items[ii].description = e.target.value; })} />
                      <Input className="col-span-1 h-8 text-xs" value={it.qty_planned} placeholder="Qtd" onChange={(e) => update((p) => { p[di].items[ii].qty_planned = e.target.value; })} />
                      <Input className="col-span-2 h-8 text-xs" value={it.order_number} placeholder="Pedido" onChange={(e) => update((p) => { p[di].items[ii].order_number = e.target.value; })} />
                      <Input className="col-span-1 h-8 text-xs" value={it.invoice} placeholder="NF" onChange={(e) => update((p) => { p[di].items[ii].invoice = e.target.value; })} />
                      <Button className="col-span-1 h-8" variant="ghost" size="icon" title="Remover item" onClick={() => update((p) => { p[di].items.splice(ii, 1); })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update((p) => { p[di].items.push({ code: "", description: "", qty_planned: "", order_number: "", invoice: "" }); })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Item
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update((p) => { p.push({ city: "", uf: "", items: [] }); })}>
              <Plus className="h-4 w-4 mr-1" /> Destino
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          {preview && <Button variant="ghost" onClick={() => setPreview(null)}>Voltar a colar</Button>}
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          {preview && <Button onClick={confirm} disabled={totalItems === 0}>Inserir {totalItems} item(ns)</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
