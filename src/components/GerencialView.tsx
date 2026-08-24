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
        <CardContent>
          {/* Celular: cartão por carregamento */}
          <div className="space-y-2 lg:hidden">
            {report.orders.map((o) => (
              <div key={o.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{o.order_number}{o.loading_number ? ` · ${o.loading_number}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{formatDateBR(o.loading_date)} · {o.driver}{o.vehicle_plate ? ` · ${o.vehicle_plate}` : ""}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground" title={o.products}>
                  {o.city ? `${o.city} · ` : ""}{o.products}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="tabular-nums">Bipados: <b>{o.scanned}/{o.quantity}</b></span>
                  <span className="text-muted-foreground">Início {fmtDateTime(o.start)}</span>
                  <span className="text-muted-foreground">Fim {fmtDateTime(o.end)}</span>
                  <span className="text-muted-foreground">Duração {fmtDuration(o.start, o.end)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto lg:block">
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
          </div>
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
          <CardContent>
            {/* Celular: cartão por produto */}
            <div className="space-y-2 sm:hidden">
              {report.products.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.code} · {p.orders} carreg.</div>
                  </div>
                  <div className="shrink-0 text-right text-sm tabular-nums">
                    <div className="font-medium">{p.pacotes} pct</div>
                    <div className="text-xs text-muted-foreground">{p.unidades} un.</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {report.products.reduce((s, p) => s + p.pacotes, 0)} pct · {report.products.reduce((s, p) => s + p.unidades, 0)} un.
                </span>
              </div>
            </div>

            {/* Desktop/tablet: tabela */}
            <div className="hidden overflow-x-auto sm:block">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-primary" />Separação por operador
            </CardTitle>
            <CardDescription>Bipes a partir do log de auditoria</CardDescription>
          </CardHeader>
          <CardContent>
            {report.operators.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem registros de operador no período.</p>
            ) : (
              <>
                {/* Celular: cartão por operador */}
                <div className="space-y-2 sm:hidden">
                  {report.operators.map((op) => (
                    <div key={op.email} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm" title={op.email}>{op.email}</span>
                        <span className="shrink-0 text-sm font-medium tabular-nums">{op.scans} bipes</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtDateTime(op.start)} – {fmtDateTime(op.end)} · {fmtDuration(op.start, op.end)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop/tablet: tabela */}
                <div className="hidden overflow-x-auto sm:block">
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
                </div>
              </>
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
                    <>
                    {/* Celular: cartão por item */}
                    <div className="space-y-1.5 sm:hidden">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-semibold">{it.package_label || "—"}</span>
                            <span className="ml-1">{it.productName}</span>
                            <div className="font-mono text-muted-foreground">{it.productCode} · {it.city || o.city || "—"}</div>
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <div>{it.pacotes} pct × {it.unitsPerPackage ?? "—"}</div>
                            <div className="font-medium">{it.unidades} un.</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden sm:block">
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
                    </div>
                    </>
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
