import { createFileRoute } from "@tanstack/react-router";
import { LoadingReport } from "@/components/LoadingReport";

export const Route = createFileRoute("/report/$orderId")({
  head: () => ({
    meta: [
      { title: "Relatório de Carregamento" },
      { name: "description", content: "Relatório de carregamento para impressão" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { orderId } = Route.useParams();
  return (
    <div className="min-h-screen bg-background print:bg-white p-4 print:p-0">
      <LoadingReport orderId={orderId} />
    </div>
  );
}
