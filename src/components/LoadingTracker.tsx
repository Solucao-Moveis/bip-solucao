import { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getOrder, addScannedCode, finishOrderEarly, removeScannedCode, formatDateBR, formatDateTimeBR, type LoadingOrder } from "@/lib/loading-store";
import { ScanBarcode, Package, CheckCircle2, XCircle, Truck, User, Calendar, AlertTriangle, ArrowLeft, Hash, FileText, Camera, Flag, MapPin, Pencil, Trash2 } from "lucide-react";
import { BarcodeScanner, type BarcodeScannerHandle } from "@/components/BarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EditOrderDialog } from "@/components/EditOrderDialog";

export function LoadingTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<LoadingOrder | undefined>();
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [finishReason, setFinishReason] = useState("");
  const [finishing, setFinishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<BarcodeScannerHandle>(null);

  const loadOrder = useCallback(async () => {
    const o = await getOrder(orderId);
    setOrder(o);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const processScan = useCallback(async (code: string) => {
    if (!code.trim()) return;
    const result = await addScannedCode(orderId, code.trim());
    if (result.success) {
      setFeedback({ type: "success", message: `✓ Pacote ${code} registrado` });
      await loadOrder();
    } else {
      setFeedback({ type: "error", message: result.error || "Erro" });
    }
    setTimeout(() => setFeedback(null), 3000);
  }, [orderId, loadOrder]);

  const requestCameraAndOpenScanner = useCallback(async () => {
    if (showScanner) return;
    flushSync(() => setShowScanner(true));
    try {
      await scannerRef.current?.start();
      setFeedback(null);
    } catch (err) {
      console.error("Camera permission error:", err);
      setShowScanner(false);
      const errorName = err instanceof DOMException ? err.name : "";
      const message =
        errorName === "NotAllowedError"
          ? "Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador."
          : errorName === "NotFoundError"
            ? "Nenhuma câmera foi encontrada neste aparelho."
            : "Não foi possível abrir a câmera. Tente novamente pelo navegador do celular.";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback(null), 4000);
    }
  }, [showScanner]);

  const closeScanner = useCallback(() => {
    void scannerRef.current?.stop().finally(() => setShowScanner(false));
  }, []);

  const handleScan = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) {
      await requestCameraAndOpenScanner();
      return;
    }
    await processScan(code);
    setBarcodeInput("");
    inputRef.current?.focus();
  }, [barcodeInput, processScan, requestCameraAndOpenScanner]);

  const handleCameraScan = useCallback(async (code: string) => {
    setShowScanner(false);
    await processScan(code);
  }, [processScan]);

  const handleFinishEarly = useCallback(async () => {
    if (!finishReason.trim()) return;
    setFinishing(true);
    const result = await finishOrderEarly(orderId, finishReason.trim());
    if (result.success) {
      setShowFinishDialog(false);
      setFinishReason("");
      await loadOrder();
    } else {
      setFeedback({ type: "error", message: result.error || "Erro ao finalizar" });
      setTimeout(() => setFeedback(null), 3000);
    }
    setFinishing(false);
  }, [finishReason, orderId, loadOrder]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!order) {
    return (
      <Card className="max-w-lg mx-auto text-center p-8">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">Pedido não encontrado</p>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        </Link>
      </Card>
    );
  }

  const progress = (order.scannedCodes.length / order.quantity) * 100;
  const isComplete = order.status === "completed";
  const remaining = order.quantity - order.scannedCodes.length;

  const handleRemoveScan = async (scanId: string) => {
    if (!confirm("Remover este bipe? O contador será atualizado.")) return;
    const result = await removeScannedCode(scanId);
    if (result.success) await loadOrder();
    else setFeedback({ type: "error", message: result.error || "Erro ao remover" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />Editar
            </Button>
          )}
          <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-success text-success-foreground" : ""}>
            {isComplete ? "Finalizado" : "Em andamento"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Detalhes do Carregamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Pedido</span>
              <p className="font-medium">{order.order_number}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Quantidade Total</span>
              <p className="font-medium">{order.quantity} pacotes</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Motorista</span>
              <p className="font-medium">{order.driver}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Cidade</span>
              <p className="font-medium">{order.city || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" />Placa</span>
              <p className="font-medium">{order.vehiclePlate}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Data</span>
              <p className="font-medium">{formatDateBR(order.loadingDate)}</p>
            </div>
          </div>
          {order.items.length > 0 && (
            <div className="mt-3 border-t pt-3 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Produtos / Pacotes</span>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.package_label && <span className="font-semibold text-primary mr-1">[{item.package_label}]</span>}
                    {item.product?.name ?? "Produto"} ({item.product?.code ?? "—"})
                  </span>
                  <span className="font-medium">
                    {item.quantity} pct
                    {item.units_per_package > 1 && ` × ${item.units_per_package} und`}
                  </span>
                </div>
              ))}
            </div>
          )}
          {order.observations && (
            <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{order.observations}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso do Carregamento</span>
            <span className="text-sm font-bold text-primary">
              {order.scannedCodes.length} / {order.quantity}
            </span>
          </div>
          <Progress value={progress} className={isComplete ? "[&>div]:bg-success" : ""} />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{Math.round(progress)}% concluído</span>
            <span>{remaining} restante{remaining !== 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>

      {!isComplete ? (
        <Card className="border-primary/30">
          <CardContent className="pt-6 space-y-4">
            {showScanner && (
              <BarcodeScanner ref={scannerRef} onScan={handleCameraScan} onClose={closeScanner} />
            )}
            <form onSubmit={handleScan} className="space-y-3">
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  className="pl-10"
                  placeholder="Bipe ou digite o código de barras..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={showScanner ? closeScanner : requestCameraAndOpenScanner}>
                  <Camera className="h-4 w-4 mr-2" />Câmera
                </Button>
                <Button type="submit" className="flex-1">
                  <ScanBarcode className="h-4 w-4 mr-2" />Registrar
                </Button>
              </div>
            </form>
            {feedback && (
              <div className={`mt-3 flex items-center gap-2 rounded-md p-3 text-sm font-medium ${feedback.type === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {feedback.message}
              </div>
            )}
            <Button type="button" variant="destructive" className="w-full" onClick={() => setShowFinishDialog(true)}>
              <Flag className="h-4 w-4 mr-2" />Finalizar Carregamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <p className="text-lg font-semibold text-foreground">Carregamento Finalizado!</p>
            <p className="text-sm text-muted-foreground">
              Todos os {order.quantity} pacotes foram registrados com sucesso.
            </p>
            <Link to="/report/$orderId" params={{ orderId }}>
              <Button size="lg" className="mt-2">
                <FileText className="h-4 w-4 mr-2" />Ver Relatório para Impressão
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {order.scannedCodes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Códigos Bipados ({order.scannedCodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {order.scannedCodes.map((code, i) => (
                <div key={code} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-secondary/50 text-sm">
                  <span className="text-muted-foreground w-8">#{i + 1}</span>
                  <span className="font-mono font-medium flex-1">{code}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Carregamento Antecipadamente</DialogTitle>
            <DialogDescription>
              Foram escaneados {order?.scannedCodes.length ?? 0} de {order?.quantity ?? 0} pacotes.
              Informe o motivo para finalizar sem completar todos os pacotes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Informe o motivo..."
            value={finishReason}
            onChange={(e) => setFinishReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFinishDialog(false); setFinishReason(""); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleFinishEarly} disabled={!finishReason.trim() || finishing}>
              {finishing ? "Finalizando..." : "Confirmar Finalização"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
