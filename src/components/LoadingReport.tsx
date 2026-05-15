import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getOrder, formatDateBR, formatDateTimeBR, type LoadingOrder } from "@/lib/loading-store";
import { getOrderPhotos, type LoadingPhoto } from "@/lib/photos";
import { Printer, ArrowLeft, Truck, Package, User, Calendar, Hash, FileText, CheckCircle2, MapPin, Camera } from "lucide-react";

export function LoadingReport({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<LoadingOrder | undefined>();
  const [photos, setPhotos] = useState<LoadingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getOrder(orderId), getOrderPhotos(orderId)]).then(([o, ps]) => {
      setOrder(o);
      setPhotos(ps);
      setLoading(false);
    });
  }, [orderId]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Pedido não encontrado</p>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const now = new Date();

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="print:hidden max-w-3xl mx-auto mb-4 flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar ao Início</Button>
        </Link>
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />Imprimir Relatório
        </Button>
      </div>

      {/* Printable report */}
      <div className="max-w-3xl mx-auto bg-white text-black print:max-w-none print:mx-0 print:shadow-none rounded-lg shadow-sm border print:border-none p-8 print:p-0">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-gray-800" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Relatório de Carregamento</h1>
                <p className="text-sm text-gray-500">Documento de conferência</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Emitido em: {now.toLocaleDateString("pt-BR")} às {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-green-50 border border-green-200 print:bg-white print:border-green-400">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-700">
            {order.status === "completed" ? "CARREGAMENTO FINALIZADO" : "CARREGAMENTO EM ANDAMENTO"}
          </span>
        </div>

        {/* Order Info Grid */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Informações do Pedido</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border rounded-lg p-4 print:border-gray-300">
            <InfoField icon={<Hash className="h-4 w-4" />} label="Nº do Pedido" value={order.order_number} />
            <InfoField icon={<Package className="h-4 w-4" />} label="Quantidade Total" value={`${order.quantity} pacotes`} />
            <InfoField icon={<User className="h-4 w-4" />} label="Motorista" value={order.driver} />
            <InfoField icon={<MapPin className="h-4 w-4" />} label="Cidade" value={order.city || "—"} />
            <InfoField icon={<Truck className="h-4 w-4" />} label="Placa do Veículo" value={order.vehiclePlate} />
            <InfoField icon={<Calendar className="h-4 w-4" />} label="Data do Carregamento" value={formatDateBR(order.loadingDate)} />
            <InfoField icon={<Package className="h-4 w-4" />} label="Pacotes Bipados" value={`${order.scannedCodes.length} de ${order.quantity}`} />
          </div>
          {order.items.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Produtos do Carregamento</h3>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left">Tipo Pacote</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Produto</th>
                    <th className="border border-gray-300 px-3 py-2 text-left w-24">Código</th>
                    <th className="border border-gray-300 px-3 py-2 text-left w-20">Pacotes</th>
                    <th className="border border-gray-300 px-3 py-2 text-left w-24">Und/Pacote</th>
                    <th className="border border-gray-300 px-3 py-2 text-left w-24">Total Prod.</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 px-3 py-1.5 font-semibold">{item.package_label || "—"}</td>
                      <td className="border border-gray-300 px-3 py-1.5">{item.product?.name ?? "—"}</td>
                      <td className="border border-gray-300 px-3 py-1.5 font-mono">{item.product?.code ?? "—"}</td>
                      <td className="border border-gray-300 px-3 py-1.5">{item.quantity}</td>
                      <td className="border border-gray-300 px-3 py-1.5">{item.units_per_package}</td>
                      <td className="border border-gray-300 px-3 py-1.5 font-semibold">{item.quantity * item.units_per_package}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Observations */}
        {order.observations && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <FileText className="h-4 w-4" />Observações
            </h2>
            <div className="border rounded-lg p-4 text-sm text-gray-700 print:border-gray-300">
              {order.observations}
            </div>
          </div>
        )}

        {/* Scanned Codes Table */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Móveis Bipados ({order.scannedCodes.length})
          </h2>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left w-12">#</th>
                <th className="border border-gray-300 px-3 py-2 text-left w-24">Pacote</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Código de Barras</th>
                <th className="border border-gray-300 px-3 py-2 text-left w-44">Data / Horário</th>
                <th className="border border-gray-300 px-3 py-2 text-left w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {order.scannedCodes.map((scan, i) => (
                <tr key={scan.id} className={i % 2 === 0 ? "" : "bg-gray-50 print:bg-gray-50"}>
                  <td className="border border-gray-300 px-3 py-1.5 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-300 px-3 py-1.5 font-semibold">{scan.package_label || "—"}</td>
                  <td className="border border-gray-300 px-3 py-1.5 font-mono">{scan.barcode}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-xs">{formatDateTimeBR(scan.scanned_at)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-green-600">✓ OK</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <p className="text-sm font-medium text-gray-700">Responsável pelo Carregamento</p>
              <p className="text-xs text-gray-400 mt-1">Nome / Assinatura</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <p className="text-sm font-medium text-gray-700">Motorista: {order.driver}</p>
              <p className="text-xs text-gray-400 mt-1">Assinatura</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</span>
      <p className="font-semibold text-sm text-gray-900">{value}</p>
    </div>
  );
}
