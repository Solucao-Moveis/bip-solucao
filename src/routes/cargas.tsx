import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout do segmento /cargas — só repassa pros filhos (lista em cargas.index, detalhe em cargas.$loadingId).
export const Route = createFileRoute("/cargas")({
  component: () => <Outlet />,
});
