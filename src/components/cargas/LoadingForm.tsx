import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, ClipboardPaste, MapPin } from "lucide-react";
import { PasteImportDialog } from "@/components/cargas/PasteImportDialog";
import { createLoading, updateLoading, type Loading, type LoadingInput, type DestinationInput } from "@/lib/cargas-store";

interface EditItem { code: string; description: string; qty_planned: string; order_number: string; invoice: string; }
interface EditDest { city: string; uf: string; items: EditItem[]; }

interface Header {
  load_number: string; load_type: string; empenho: string; entrega: string; driver_name: string;
  vehicle_plate: string; start_date: string; end_date: string; start_time: string; end_time: string;
  departure_forecast: string; observations: string;
}
const emptyHeader = (): Header => ({
  load_number: "", load_type: "", empenho: "", entrega: "", driver_name: "",
  vehicle_plate: "", start_date: "", end_date: "", start_time: "", end_time: "",
  departure_forecast: "", observations: "",
});
const emptyItem = (): EditItem => ({ code: "", description: "", qty_planned: "", order_number: "", invoice: "" });

function fromLoading(l?: Loading): { header: Header; dests: EditDest[] } {
  if (!l) return { header: emptyHeader(), dests: [{ city: "", uf: "", items: [emptyItem()] }] };
  return {
    header: {
      load_number: l.load_number ?? "", load_type: l.load_type ?? "", empenho: l.empenho ?? "", entrega: l.entrega ?? "",
      driver_name: l.driver_name ?? "", vehicle_plate: l.vehicle_plate ?? "",
      start_date: l.start_date ?? "", end_date: l.end_date ?? "", start_time: l.start_time ?? "", end_time: l.end_time ?? "",
      departure_forecast: l.departure_forecast ?? "", observations: l.observations ?? "",
    },
    dests: l.destinations.length
      ? l.destinations.map((d) => ({
          city: d.city, uf: d.uf ?? "",
          items: d.items.length
            ? d.items.map((it) => ({
                code: it.code ?? "", description: it.description ?? "",
                qty_planned: it.qty_planned ? String(it.qty_planned) : "",
                order_number: it.order_number ?? "", invoice: it.invoice ?? "",
              }))
            : [emptyItem()],
        }))
      : [{ city: "", uf: "", items: [emptyItem()] }],
  };
}

export function LoadingForm({ initial, onSaved }: { initial?: Loading; onSaved?: (id: string) => void }) {
  const seed = fromLoading(initial);
  const [header, setHeader] = useState<Header>(seed.header);
  const [dests, setDests] = useState<EditDest[]>(seed.dests);
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setH = (k: keyof Header, v: string) => setHeader((h) => ({ ...h, [k]: v }));
  const editDests = (fn: (d: EditDest[]) => void) =>
    setDests((prev) => {
      const copy = prev.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) }));
      fn(copy);
      return copy;
    });

  const onPasteConfirm = (incoming: DestinationInput[]) => {
    editDests((d) => {
      const base = d.length === 1 && !d[0].city && d[0].items.every((i) => !i.code && !i.description) ? [] : d;
      const mapped: EditDest[] = incoming.map((dd) => ({
        city: dd.city, uf: dd.uf ?? "",
        items: dd.items.length
          ? dd.items.map((it) => ({
              code: it.code ?? "", description: it.description ?? "",
              qty_planned: it.qty_planned ? String(it.qty_planned) : "",
              order_number: it.order_number ?? "", invoice: it.invoice ?? "",
            }))
          : [emptyItem()],
      }));
      d.length = 0;
      d.push(...base, ...mapped);
    });
  };

  const buildInput = (): LoadingInput => ({
    ...header,
    destinations: dests
      .filter((d) => d.city.trim() || d.items.some((i) => i.code || i.description || i.qty_planned))
      .map((d) => ({
        city: d.city, uf: d.uf || null,
        items: d.items
          .filter((i) => i.code || i.description || i.qty_planned)
          .map((i) => ({
            code: i.code, description: i.description,
            qty_planned: Number(String(i.qty_planned).trim().replace(/\./g, "").replace(",", ".")) || 0,
            order_number: i.order_number, invoice: i.invoice,
          })),
      })),
  });

  const submit = async () => {
    setError("");
    const input = buildInput();
    if (input.destinations.length === 0) { setError("Adicione ao menos um destino com itens."); return; }
    setSaving(true);
    try {
      let id = initial?.id;
      if (initial) await updateLoading(initial.id, input);
      else id = await createLoading(input);
      onSaved?.(id!);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao salvar a carga");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados da carga</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Número da carga"><Input value={header.load_number} onChange={(e) => setH("load_number", e.target.value)} placeholder="ex.: 260426" /></Field>
          <Field label="Motorista"><Input value={header.driver_name} onChange={(e) => setH("driver_name", e.target.value)} /></Field>
          <Field label="Placa"><Input value={header.vehicle_plate} onChange={(e) => setH("vehicle_plate", e.target.value)} /></Field>
          <Field label="Data início"><Input type="date" value={header.start_date} onChange={(e) => setH("start_date", e.target.value)} /></Field>
          <Field label="Data término"><Input type="date" value={header.end_date} onChange={(e) => setH("end_date", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hora início"><Input type="time" value={header.start_time} onChange={(e) => setH("start_time", e.target.value)} /></Field>
            <Field label="Hora término"><Input type="time" value={header.end_time} onChange={(e) => setH("end_time", e.target.value)} /></Field>
          </div>
          <Field label="Previsão de saída"><Input type="datetime-local" value={header.departure_forecast} onChange={(e) => setH("departure_forecast", e.target.value)} /></Field>
          <Field label="Carregamento (tipo)"><Input value={header.load_type} onChange={(e) => setH("load_type", e.target.value)} placeholder="ex.: CHAPAS" /></Field>
          <Field label="Empenho"><Input value={header.empenho} onChange={(e) => setH("empenho", e.target.value)} /></Field>
          <Field label="Entrega"><Input value={header.entrega} onChange={(e) => setH("entrega", e.target.value)} /></Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Observações"><Textarea value={header.observations} onChange={(e) => setH("observations", e.target.value)} rows={2} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Destinos e itens</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowPaste(true)}><ClipboardPaste className="h-4 w-4 mr-2" /> Colar tabela</Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {dests.map((d, di) => (
            <div key={di} className="rounded-md border p-3 space-y-3">
              <div className="flex items-end gap-2">
                <MapPin className="mb-2 h-4 w-4 text-primary" />
                <div className="flex-1"><Field label="Cidade"><Input value={d.city} onChange={(e) => editDests((x) => { x[di].city = e.target.value; })} placeholder="ex.: TERESINA" /></Field></div>
                <div className="w-20"><Field label="UF"><Input value={d.uf} maxLength={2} onChange={(e) => editDests((x) => { x[di].uf = e.target.value.toUpperCase(); })} placeholder="PI" /></Field></div>
                <Button variant="ghost" size="icon" title="Remover destino" onClick={() => editDests((x) => { x.splice(di, 1); })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                {d.items.map((it, ii) => (
                  <div key={ii} className="grid grid-cols-12 gap-2 items-start border-t pt-2">
                    <div className="col-span-3 sm:col-span-2"><Input className="h-8 text-xs" value={it.code} placeholder="Código" onChange={(e) => editDests((x) => { x[di].items[ii].code = e.target.value; })} /></div>
                    <div className="col-span-9 sm:col-span-5"><Textarea className="text-xs min-h-[2rem]" rows={1} value={it.description} placeholder="Descrição (cole o blocão do kit)" onChange={(e) => editDests((x) => { x[di].items[ii].description = e.target.value; })} /></div>
                    <div className="col-span-3 sm:col-span-1"><Input className="h-8 text-xs" value={it.qty_planned} placeholder="Qtd" onChange={(e) => editDests((x) => { x[di].items[ii].qty_planned = e.target.value; })} /></div>
                    <div className="col-span-4 sm:col-span-2"><Input className="h-8 text-xs" value={it.order_number} placeholder="Pedido" onChange={(e) => editDests((x) => { x[di].items[ii].order_number = e.target.value; })} /></div>
                    <div className="col-span-3 sm:col-span-1"><Input className="h-8 text-xs" value={it.invoice} placeholder="NF" onChange={(e) => editDests((x) => { x[di].items[ii].invoice = e.target.value; })} /></div>
                    <div className="col-span-2 sm:col-span-1">
                      <Button className="h-8" variant="ghost" size="icon" title="Remover item" onClick={() => editDests((x) => { x[di].items.splice(ii, 1); })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => editDests((x) => { x[di].items.push(emptyItem()); })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Item
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => editDests((x) => { x.push({ city: "", uf: "", items: [emptyItem()] }); })}>
            <Plus className="h-4 w-4 mr-1" /> Destino
          </Button>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={submit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : initial ? "Salvar alterações" : "Criar carga"}
        </Button>
      </div>

      <PasteImportDialog open={showPaste} onOpenChange={setShowPaste} onConfirm={onPasteConfirm} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
