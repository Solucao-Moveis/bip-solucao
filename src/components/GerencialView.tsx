import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateBR } from "@/lib/loading-store";
import { fmtDateTime, fmtDuration, STATUS_LABEL, type SeparationReport } from "@/lib/gerencial";
import { Truck, Package, Users, Calendar, Clock, Flag, Boxes, UserCog, ListChecks } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  if (status === "completed") return <Badge className="bg-success text-success-foreground">{label}</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function GerencialView({ report, showItems }: { report: SeparationReport; showItems: boolean }) {
  if (report.totalOrders === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum carregamento neste período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi icon={<Truck className="h-5 w-5" />} label="Carregamentos" value={String(report.totalOrders)} />
        <Kpi icon={<Package className="h-5 w-5" />} label="Pacotes bipados" value={`${report.totalScanned}/${report.totalExpected}`} />
        <Kpi icon={<Users className="h-5 w-5" />} label="Operadores" value={String(report.operators.length)} />
        <Kpi icon={<Calendar className="h-5 w-5" />} label="Início" value={fmtDateTime(report.periodStart)} />
        <Kpi icon={<Flag className="h-5 w-5" />} label="Fim" value={fmtDateTime(report.periodEnd)} />
        <Kpi icon={<Clock className="h-5 w-5" />} label="Duração total" value={fmtDuration(report.periodStart, report.periodEnd)} />
      </div>

      {/* Carregamentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-primary" />Carregamentos do período
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Carregamento</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="text-right">Bipados</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="whitespace-nowrap">{formatDateBR(o.loading_date)}</TableCell>
                  <TableCell className="font-medium">{o.order_number}</TableCell>
                  <TableCell>{o.loading_number || "—"}</TableCell>
                  <TableCell>{o.driver}</TableCell>
                  <TableCell className="font-mono text-xs">{o.vehicle_plate}</TableCell>
                  <TableCell>{o.city || "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={o.products}>{o.products}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.scanned}/{o.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDateTime(o.start)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDateTime(o.end)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDuration(o.start, o.end)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Produtos + Operadores lado a lado no desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4 text-primary" />Produtos separados no período
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Carreg.</TableHead>
                  <TableHead className="text-right">Pacotes</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.products.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.orders}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{p.pacotes}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{p.unidades}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{report.products.reduce((s, p) => s + p.pacotes, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{report.products.reduce((s, p) => s + p.unidades, 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-primary" />Separação por operador
            </CardTitle>
            <CardDescription>Bipes a partir do log de auditoria</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {report.operators.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem registros de operador no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-right">Bipes</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.operators.map((op) => (
                    <TableRow key={op.email}>
                      <TableCell className="max-w-[200px] truncate" title={op.email}>{op.email}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{op.scans}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDateTime(op.start)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDateTime(op.end)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDuration(op.start, op.end)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por carregamento */}
      {showItems && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" />Detalhamento por carregamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 xl:grid-cols-2">
              {report.orders.map((o) => (
                <div key={o.id} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">
                    #{o.order_number} — {o.driver}
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {o.vehicle_plate}{o.city ? ` · ${o.city}` : ""} · {formatDateBR(o.loading_date)}
                    </span>
                  </p>
                  {o.items.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">Sem itens cadastrados.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pacote</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="text-right">Pacotes</TableHead>
                          <TableHead className="text-right">Und/Pct</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {o.items.map((it, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold">{it.package_label || "—"}</TableCell>
                            <TableCell>
                              {it.productName}
                              <span className="ml-1 font-mono text-xs text-muted-foreground">{it.productCode}</span>
                            </TableCell>
                            <TableCell>{it.city || o.city || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{it.pacotes}</TableCell>
                            <TableCell className="text-right tabular-nums">{it.unitsPerPackage ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{it.unidades}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
