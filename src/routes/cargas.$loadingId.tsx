import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Save, PenLine, FileDown, FileCheck, Pencil, Trash2, MapPin, Truck, User, Calendar, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LoadingForm } from "@/components/cargas/LoadingForm";
import { useExpedicao } from "@/hooks/useExpedicao";
import { useAuth } from "@/hooks/useAuth";
import {
  getLoading, saveActuals, updateObservations, signLoading, uploadLoadingPdf, deleteLoading, setInvoiced,
  formatDateBR, STATUS_LABEL, type Loading, type LoadStatus,
} from "@/lib/cargas-store";
import { generateLoadingPdf, downloadBlob, loadingFilename } from "@/lib/cargas-pdf";

export const Route = createFileRoute("/cargas/$loadingId")({
  component: CargaPage,
});

const STATUS_STYLE: Record<LoadStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_carregamento: "bg-amber-100 text-amber-800",
  assinado: "bg-emerald-100 text-emerald-800",
};

function num(s: string): number | null {
  const t = String(s).trim();
  if (t === "") return null;
  const x = Number(t.replace(",", "."));
  return Number.isFinite(x) ? x : null;
}
function fmtDT(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function CargaPage() {
  const { loadingId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has } = useExpedicao();
  const canExecute = has("carregador", "pcp", "admin");
  const isPcp = has("pcp", "admin");
  const isAdmin = has("admin");
  const isFat = has("faturamento", "admin");

  const [loading, setLoading] = useState<Loading | undefined>();
  const [notFound, setNotFound] = useState(false);
  const [edits, setEdits] = useState<Record<string, { qty: string; nf: string }>>({});
  const [obs, setObs] = useState("");
  const [signer, setSigner] = useState("");
  const [invName, setInvName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const l = await getLoading(loadingId);
    if (!l) { setNotFound(true); return; }
    setLoading(l);
    setObs(l.observations ?? "");
    const e: Record<string, { qty: string; nf: string }> = {};
    for (const d of l.destinations) for (const it of d.items) {
      e[it.id] = { qty: it.qty_actual !== null ? String(it.qty_actual) : String(it.qty_planned ?? ""), nf: it.invoice ?? "" };
    }
    setEdits(e);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [loadingId]);
  useEffect(() => {
    const def = user?.user_metadata?.full_name ?? user?.email ?? "";
    setSigner((cur) => cur || def);
    setInvName((cur) => cur || def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading?.id, user]);

  if (notFound) {
    return (
      <AppLayout pageTitle="Carga">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Carga não encontrada ou sem acesso.</p>
          <Link to="/cargas"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button></Link>
        </div>
      </AppLayout>
    );
  }
  if (!loading) return <AppLayout pageTitle="Carga"><p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p></AppLayout>;

  const signed = loading.status === "assinado";
  const editable = canExecute && !signed;
  const allItems = loading.destinations.flatMap((d) => d.items);

  const saveQuantities = async () => {
    setBusy(true); setMsg(null);
    const updates = allItems.map((it) => ({ id: it.id, qty_actual: num(edits[it.id]?.qty ?? ""), invoice: edits[it.id]?.nf ?? null }));
    const r = await saveActuals(loading.id, updates);
    await updateObservations(loading.id, obs);
    setBusy(false);
    if (r.success) { setMsg({ type: "ok", text: "Quantidades salvas." }); load(); }
    else setMsg({ type: "err", text: r.error ?? "Erro ao salvar" });
  };

  const sign = async () => {
    if (!signer.trim()) { setMsg({ type: "err", text: "Informe quem está assinando." }); return; }
    if (!confirm("Assinar e concluir esta carga? Depois de assinada, só o administrador pode editar.")) return;
    setBusy(true); setMsg(null);
    const updates = allItems.map((it) => ({ id: it.id, qty_actual: num(edits[it.id]?.qty ?? ""), invoice: edits[it.id]?.nf ?? null }));
    const sSave = await saveActuals(loading.id, updates);
    if (!sSave.success) { setBusy(false); setMsg({ type: "err", text: sSave.error ?? "Erro ao salvar antes de assinar" }); return; }
    await updateObservations(loading.id, obs);
    const r = await signLoading(loading.id, signer);
    if (!r.success) { setBusy(false); setMsg({ type: "err", text: r.error ?? "Erro ao assinar" }); return; }
    const fresh = await getLoading(loading.id);
    if (fresh) { try { const blob = await generateLoadingPdf(fresh); await uploadLoadingPdf(fresh.id, blob); } catch { /* best-effort */ } }
    setBusy(false);
    setMsg({ type: "ok", text: "Carga assinada." });
    load();
  };

  const downloadPdf = async () => {
    setBusy(true);
    try { const blob = await generateLoadingPdf(loading); downloadBlob(blob, loadingFilename(loading)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Excluir esta carga? Esta ação não pode ser desfeita.")) return;
    const r = await deleteLoading(loading.id);
    if (r.success) navigate({ to: "/cargas" });
    else setMsg({ type: "err", text: r.error ?? "Erro ao excluir" });
  };

  const toggleInvoiced = async (v: boolean) => {
    setBusy(true); setMsg(null);
    const r = await setInvoiced(loading.id, v, invName || signer);
    setBusy(false);
    if (r.success) { setMsg({ type: "ok", text: v ? "NF marcada como emitida." : "NF desmarcada." }); load(); }
    else setMsg({ type: "err", text: r.error ?? "Erro ao atualizar faturamento" });
  };

  const totalPlanned = allItems.reduce((s, it) => s + (it.qty_planned ?? 0), 0);
  const totalActual = allItems.reduce((s, it) => s + (num(edits[it.id]?.qty ?? "") ?? 0), 0);

  return (
    <AppLayout pageTitle={`Carga ${loading.load_number ?? ""}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/cargas"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button></Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={STATUS_STYLE[loading.status]}>{STATUS_LABEL[loading.status]}</Badge>
            <Button variant="outline" size="sm" onClick={downloadPdf} disabled={busy}><FileDown className="h-4 w-4 mr-2" />Baixar PDF</Button>
            {isPcp && (isAdmin || loading.status === "rascunho") && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" />Editar carga</Button>
            )}
            {(isAdmin || (isPcp && loading.status === "rascunho")) && (
              <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Carga {loading.load_number ?? "—"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <Info icon={User} label="Motorista" value={loading.driver_name} />
            <Info icon={Truck} label="Placa" value={loading.vehicle_plate} />
            <Info icon={Calendar} label="Data" value={[formatDateBR(loading.start_date), formatDateBR(loading.end_date)].join(" — ")} />
            <Info icon={Clock} label="Hora" value={[loading.start_time, loading.end_time].filter(Boolean).join(" — ") || "—"} />
            <Info icon={Clock} label="Previsão de saída" value={fmtDT(loading.departure_forecast)} />
            <Info label="Carregamento" value={loading.load_type} />
            <Info label="Empenho" value={loading.empenho} />
            <Info label="Total (real/solic.)" value={`${totalActual} / ${totalPlanned}`} />
          </CardContent>
        </Card>

        {loading.destinations.map((d) => (
          <Card key={d.id}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" />{[d.city, d.uf].filter(Boolean).join("/")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-1 py-2 text-left">Código</th>
                    <th className="px-1 py-2 text-left">Descrição</th>
                    <th className="px-1 py-2 text-center">Pedido</th>
                    <th className="px-1 py-2 text-center">Solic.</th>
                    <th className="px-1 py-2 text-center">Real</th>
                    <th className="px-1 py-2 text-center">NF</th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((it) => {
                    const e = edits[it.id] ?? { qty: "", nf: "" };
                    const diff = (num(e.qty) ?? 0) !== (it.qty_planned ?? 0);
                    return (
                      <tr key={it.id} className="border-b align-top">
                        <td className="px-1 py-2 font-mono text-xs">{it.code}</td>
                        <td className="px-1 py-2 whitespace-pre-line text-xs">{it.description}</td>
                        <td className="px-1 py-2 text-center text-xs">{it.order_number}</td>
                        <td className="px-1 py-2 text-center font-medium">{it.qty_planned}</td>
                        <td className="px-1 py-2 text-center">
                          {editable ? (
                            <Input className={`mx-auto h-8 w-16 text-center text-xs ${diff ? "border-amber-400" : ""}`} value={e.qty}
                              onChange={(ev) => setEdits((p) => ({ ...p, [it.id]: { ...e, qty: ev.target.value } }))} />
                          ) : (
                            <span className={diff ? "font-semibold text-amber-700" : ""}>{it.qty_actual ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-1 py-2 text-center">
                          {editable ? (
                            <Input className="mx-auto h-8 w-20 text-center text-xs" value={e.nf}
                              onChange={(ev) => setEdits((p) => ({ ...p, [it.id]: { ...e, nf: ev.target.value } }))} />
                          ) : (it.invoice || "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader><CardTitle className="text-base">Conclusão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} disabled={!editable} />
            </div>
            {signed ? (
              <div className="rounded-md border bg-emerald-50 p-3 text-sm">
                <p className="font-medium text-emerald-800">Assinado por {loading.signed_by_name}</p>
                {loading.signed_at && <p className="text-xs text-emerald-700">{new Date(loading.signed_at).toLocaleString("pt-BR")}</p>}
              </div>
            ) : editable ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <Label className="text-xs">Assinante (responsável)</Label>
                  <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Seu nome" />
                </div>
                <Button variant="outline" onClick={saveQuantities} disabled={busy}><Save className="h-4 w-4 mr-2" />Salvar quantidades</Button>
                <Button onClick={sign} disabled={busy}><PenLine className="h-4 w-4 mr-2" />Assinar e concluir</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Você não tem permissão para preencher/assinar esta carga.</p>
            )}
            {msg && <p className={`text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-destructive"}`}>{msg.text}</p>}
          </CardContent>
        </Card>

        {/* Faturamento — emissão da NF */}
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento (Nota Fiscal)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading.departure_forecast && <p className="text-sm">Previsão de saída: <span className="font-medium">{fmtDT(loading.departure_forecast)}</span></p>}
            {loading.invoiced ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-emerald-50 p-3 text-sm">
                <span className="font-medium text-emerald-800">
                  NF emitida{loading.invoiced_by_name ? ` por ${loading.invoiced_by_name}` : ""}
                  {loading.invoiced_at ? ` · ${new Date(loading.invoiced_at).toLocaleString("pt-BR")}` : ""}
                </span>
                {isFat && <Button variant="ghost" size="sm" onClick={() => toggleInvoiced(false)} disabled={busy}>Desmarcar</Button>}
              </div>
            ) : isFat ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <Label className="text-xs">Quem emitiu</Label>
                  <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Seu nome" />
                </div>
                <Button onClick={() => toggleInvoiced(true)} disabled={busy}><FileCheck className="h-4 w-4 mr-2" />Marcar NF como emitida</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aguardando o faturamento emitir a nota.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogTitle>Editar carga {loading.load_number ?? ""}</DialogTitle>
          <LoadingForm initial={loading} onSaved={() => { setEditing(false); load(); }} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Info({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | null }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">{Icon && <Icon className="h-3 w-3" />}{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
