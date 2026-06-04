import { formatDateBR } from "@/lib/loading-store";
import { fmtDateTime as fmtDT, fmtDuration as fmtDur, STATUS_LABEL as STATUS, type SeparationReport } from "@/lib/gerencial";
import logoSolucao from "@/assets/logo-solucao-moveis.png";
import { Truck, Package, Clock, Users, Calendar } from "lucide-react";

export function SeparationReportDoc({ report, showItems = true }: { report: SeparationReport; showItems?: boolean }) {
  const now = new Date();
  const totalPacotes = report.products.reduce((s, p) => s + p.pacotes, 0);
  const totalUnidades = report.products.reduce((s, p) => s + p.unidades, 0);
  const periodLabel =
    report.from === report.to
      ? formatDateBR(report.from)
      : `${formatDateBR(report.from)} a ${formatDateBR(report.to)}`;

  return (
    <div className="max-w-5xl mx-auto bg-white text-black rounded-lg shadow-sm border print:border-none print:shadow-none p-8 print:p-0">
      {/* Cabeçalho */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSolucao} alt="Solução Móveis" className="h-16 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatório de Separação</h1>
              <p className="text-sm text-gray-500">Período: {periodLabel}</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Emitido em: {now.toLocaleDateString("pt-BR")} às {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat icon={<Truck className="h-4 w-4" />} label="Carregamentos" value={String(report.totalOrders)} />
        <Stat icon={<Package className="h-4 w-4" />} label="Pacotes bipados" value={`${report.totalScanned} / ${report.totalExpected}`} />
        <Stat icon={<Users className="h-4 w-4" />} label="Operadores" value={String(report.operators.length)} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Início da separação" value={fmtDT(report.periodStart)} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Fim da separação" value={fmtDT(report.periodEnd)} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Duração total" value={fmtDur(report.periodStart, report.periodEnd)} />
      </div>

      {report.totalOrders === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum carregamento neste período.</p>
      ) : (
        <>
          {/* Carregamentos */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Carregamentos do período</h2>
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left">Data</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Pedido</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Motorista</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Placa</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Cidade</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Produtos</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Bipados</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Início</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Fim</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Duração</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.orders.map((o, i) => (
                  <tr key={o.id} className={i % 2 === 0 ? "" : "bg-gray-50 print:bg-gray-50"}>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{formatDateBR(o.loading_date)}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium">{o.order_number}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{o.driver}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-mono">{o.vehicle_plate}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{o.city || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{o.products}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{o.scanned}/{o.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDT(o.start)}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDT(o.end)}</td>
                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDur(o.start, o.end)}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{STATUS[o.status] ?? o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Produtos separados no período (consolidado) */}
          {report.products.length > 0 && (
            <div className="mb-6 break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Produtos separados no período</h2>
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th className="border border-gray-300 px-2 py-2 text-left">Produto</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-24">Código</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-28">Carregamentos</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-24">Pacotes</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-24">Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((p, i) => (
                    <tr key={p.key} className={i % 2 === 0 ? "" : "bg-gray-50 print:bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1.5">{p.name}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-mono">{p.code}</td>
                      <td className="border border-gray-300 px-2 py-1.5">{p.orders}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-medium">{p.pacotes}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-medium">{p.unidades}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 print:bg-gray-100 font-semibold">
                    <td className="border border-gray-300 px-2 py-1.5" colSpan={3}>Total</td>
                    <td className="border border-gray-300 px-2 py-1.5">{totalPacotes}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{totalUnidades}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Operadores */}
          {report.operators.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Separação por operador</h2>
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th className="border border-gray-300 px-2 py-2 text-left">Operador</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Bipes</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Início</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Fim</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {report.operators.map((op) => (
                    <tr key={op.email}>
                      <td className="border border-gray-300 px-2 py-1.5">{op.email}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-medium">{op.scans}</td>
                      <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDT(op.start)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDT(op.end)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDur(op.start, op.end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-400 mt-1">* "Bipes" considera os registros de leitura no período (do log de auditoria).</p>
            </div>
          )}

          {/* Detalhamento por carregamento */}
          {showItems && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Detalhamento por carregamento</h2>
              <div className="space-y-4">
                {report.orders.map((o) => (
                  <div key={o.id} className="break-inside-avoid">
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      # {o.order_number} — {o.driver} · {o.vehicle_plate}
                      {o.city ? ` · ${o.city}` : ""} · {formatDateBR(o.loading_date)}
                    </p>
                    {o.items.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Sem itens cadastrados.</p>
                    ) : (
                      <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                          <tr className="bg-gray-100 print:bg-gray-100">
                            <th className="border border-gray-300 px-2 py-1.5 text-left w-24">Tipo Pacote</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left">Produto</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left w-24">Código</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left">Cidade</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left w-20">Pacotes</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left w-20">Und/Pct</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left w-20">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold">{it.package_label || "—"}</td>
                              <td className="border border-gray-300 px-2 py-1">{it.productName}</td>
                              <td className="border border-gray-300 px-2 py-1 font-mono">{it.productCode}</td>
                              <td className="border border-gray-300 px-2 py-1">{it.city || o.city || "—"}</td>
                              <td className="border border-gray-300 px-2 py-1">{it.pacotes}</td>
                              <td className="border border-gray-300 px-2 py-1">{it.unitsPerPackage ?? "—"}</td>
                              <td className="border border-gray-300 px-2 py-1 font-medium">{it.unidades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 print:border-gray-300">
      <span className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</span>
      <p className="font-bold text-lg text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
