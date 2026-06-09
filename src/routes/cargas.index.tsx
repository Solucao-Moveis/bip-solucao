import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Truck, User, Calendar, MapPin, Plus, Hash, PackageCheck } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useExpedicao } from "@/hooks/useExpedicao";
import { LoadingForm } from "@/components/cargas/LoadingForm";
import { getLoadings, formatDateBR, STATUS_LABEL, type LoadingListItem, type LoadStatus } from "@/lib/cargas-store";

export const Route = createFileRoute("/cargas/")({
  head: () => ({ meta: [{ title: "Registro de Carregamento" }] }),
  component: CargasPage,
});

const STATUS_STYLE: Record<LoadStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_carregamento: "bg-amber-100 text-amber-800",
  assinado: "bg-emerald-100 text-emerald-800",
};

function DepartureChip({ forecast, invoiced }: { forecast: string | null; invoiced: boolean }) {
  if (invoiced || !forecast) return null;
  const d = new Date(forecast);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  const label = d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const cls = diff < 0 ? "bg-red-100 text-red-800" : diff < 2 * 3600 * 1000 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";
  return <Badge className={cls}>{diff < 0 ? "Atrasada · " : "Sai "}{label}</Badge>;
}

function CargasPage() {
  const navigate = useNavigate();
  const { isMember, loading: rolesLoading, has } = useExpedicao();
  const canCreate = has("pcp", "admin");
  const [list, setList] = useState<LoadingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = () => getLoadings().then(setList).catch(() => setList([])).finally(() => setLoading(false));
  useEffect(() => { if (isMember) load(); else if (!rolesLoading) setLoading(false); }, [isMember, rolesLoading]);

  if (!rolesLoading && !isMember) {
    return (
      <AppLayout pageTitle="Registro de Carregamento">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Você não tem acesso ao Registro de Carregamento. Peça à diretoria pra liberar na aba Usuários do ERP.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Registro de Carregamento">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Registro de Carregamento</h2>
            <p className="text-sm text-muted-foreground">{loading ? "Carregando..." : `${list.length} carga(s)`}</p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Nova carga</Button>
          )}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Truck className="h-6 w-6 text-primary" /></div>
              <p className="text-sm text-muted-foreground">Nenhuma carga registrada ainda.</p>
              {canCreate && <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Nova carga</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((l) => (
              <Link key={l.id} to="/cargas/$loadingId" params={{ loadingId: l.id }} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex items-center gap-1 text-sm font-semibold">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{l.load_number || "sem número"}
                      </p>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge className={STATUS_STYLE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                        {l.invoiced && <Badge className="bg-emerald-100 text-emerald-800">NF emitida</Badge>}
                        <DepartureChip forecast={l.departure_forecast} invoiced={l.invoiced} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground"><Calendar className="h-3 w-3" />{formatDateBR(l.start_date)}</span>
                      {l.driver_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{l.driver_name}</span>}
                      {l.vehicle_plate && <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{l.vehicle_plate}</span>}
                    </div>
                    {l.cities.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" /><span className="line-clamp-1">{l.cities.join(" · ")}</span>
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t pt-2 text-xs">
                      <span className="text-muted-foreground">{l.items_count} item(ns)</span>
                      <span className="flex items-center gap-1 font-medium"><PackageCheck className="h-3.5 w-3.5 text-primary" />{l.total_actual} / {l.total_planned}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogTitle>Nova carga</DialogTitle>
          <LoadingForm onSaved={(id) => { setShowNew(false); navigate({ to: "/cargas/$loadingId", params: { loadingId: id } }); }} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
