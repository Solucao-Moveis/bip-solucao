import { createFileRoute } from "@tanstack/react-router";
import { LoadingTracker } from "@/components/LoadingTracker";

export const Route = createFileRoute("/loading/$orderId")({
  head: () => ({
    meta: [
      { title: "Acompanhamento de Carregamento" },
      { name: "description", content: "Acompanhe o progresso do carregamento em tempo real" },
    ],
  }),
  component: LoadingPage,
});

function LoadingPage() {
  const { orderId } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <LoadingTracker orderId={orderId} />
      </main>
    </div>
  );
}
