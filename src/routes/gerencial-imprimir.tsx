import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SeparationReportDoc } from "@/components/SeparationReportDoc";
import { getSeparationReport, type SeparationReport } from "@/lib/gerencial";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/gerencial-imprimir")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: String(s.from ?? ""),
    to: String(s.to ?? ""),
    det: s.det === 0 || s.det === "0" ? 0 : 1,
  }),
  head: () => ({
    meta: [{ title: "Relatório de Separação" }],
  }),
  component: PrintPage,
});

function PrintPage() {
  const { from, to, det } = Route.useSearch();
  const [report, setReport] = useState<SeparationReport | null>(null);

  useEffect(() => {
    let active = true;
    getSeparationReport(from, to).then((r) => {
      if (!active) return;
      setReport(r);
      // Abre o diálogo de impressão assim que o relatório carrega.
      setTimeout(() => window.print(), 500);
    });
    return () => { active = false; };
  }, [from, to]);

  return (
    <div className="min-h-screen bg-background print:bg-white p-4 print:p-0">
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link to="/gerencial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4 mr-2" />Imprimir
        </Button>
      </div>
      {report ? (
        <SeparationReportDoc report={report} showItems={det !== 0} />
      ) : (
        <p className="text-center py-12 text-muted-foreground">Carregando relatório...</p>
      )}
    </div>
  );
}
