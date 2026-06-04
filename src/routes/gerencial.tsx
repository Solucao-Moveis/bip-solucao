import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { GerencialView } from "@/components/GerencialView";
import { getSeparationReport, type SeparationReport } from "@/lib/gerencial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Printer, RefreshCw, CalendarRange } from "lucide-react";

export const Route = createFileRoute("/gerencial")({
  head: () => ({ meta: [{ title: "Gerencial — Expedição" }] }),
  component: GerencialPage,
});

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function GerencialPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<SeparationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const today = toISO(new Date());
    setFrom(today);
    setTo(today);
  }, []);

  const load = async (f: string, t: string) => {
    if (!f || !t) return;
    setLoading(true);
    try {
      setReport(await getSeparationReport(f, t));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const setRange = (f: string, t: string) => { setFrom(f); setTo(t); };
  const presetToday = () => { const t = toISO(new Date()); setRange(t, t); };
  const presetDays = (n: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (n - 1));
    setRange(toISO(start), toISO(end));
  };
  const presetMonth = () => {
    const now = new Date();
    setRange(toISO(new Date(now.getFullYear(), now.getMonth(), 1)), toISO(now));
  };

  const presets: { label: string; active: boolean; on: () => void }[] = (() => {
    const today = toISO(new Date());
    const d = (n: number) => { const s = new Date(); s.setDate(new Date().getDate() - (n - 1)); return toISO(s); };
    const monthStart = (() => { const n = new Date(); return toISO(new Date(n.getFullYear(), n.getMonth(), 1)); })();
    return [
      { label: "Hoje", active: from === today && to === today, on: presetToday },
      { label: "7 dias", active: from === d(7) && to === today, on: () => presetDays(7) },
      { label: "30 dias", active: from === d(30) && to === today, on: () => presetDays(30) },
      { label: "Este mês", active: from === monthStart && to === today, on: presetMonth },
    ];
  })();

  const canPrint = !loading && !!report && report.totalOrders > 0;

  return (
    <AppLayout pageTitle="Gerencial">
      <div className="space-y-6">
        {/* Toolbar */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-4">
              {/* Período */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />Período
                </Label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                  <span className="text-muted-foreground">→</span>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
              </div>

              {/* Atalhos */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Atalhos</Label>
                <div className="flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      size="sm"
                      variant={p.active ? "default" : "outline"}
                      onClick={p.on}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={showItems} onCheckedChange={setShowItems} />
                Detalhar itens
              </label>
              <Button variant="outline" onClick={() => load(from, to)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
              </Button>
              <Button
                onClick={() => navigate({ to: "/gerencial-imprimir", search: { from, to, det: showItems ? 1 : 0 } })}
                disabled={!canPrint}
              >
                <Printer className="h-4 w-4 mr-2" />Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Relatório */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Carregando relatório...</div>
        ) : report ? (
          <GerencialView report={report} showItems={showItems} />
        ) : null}
      </div>
    </AppLayout>
  );
}
