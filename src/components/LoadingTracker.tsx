import { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getOrder, addScannedCode, finishOrderEarly, reopenOrder, removeScannedCode, updateOrderObservations, formatDateBR, formatDateTimeBR, type LoadingOrder } from "@/lib/loading-store";
import { ScanBarcode, Package, CheckCircle2, XCircle, Truck, User, Calendar, AlertTriangle, ArrowLeft, Hash, FileText, Camera, ImagePlus, Flag, MapPin, Pencil, Trash2, RotateCcw } from "lucide-react";
import { BarcodeScanner, type BarcodeScannerHandle } from "@/components/BarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EditOrderDialog } from "@/components/EditOrderDialog";
import { PhotoCapture, type PhotoCaptureHandle } from "@/components/PhotoCapture";
import { homeHref } from "@/lib/view-mode";

export function LoadingTracker({ orderId, onClose }: { orderId: string; onClose?: () => void }) {
  const [order, setOrder] = useState<LoadingOrder | undefined>();
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [finishReason, setFinishReason] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<BarcodeScannerHandle>(null);
  const photoRef = useRef<PhotoCaptureHandle>(null);
  // Observação editável direto na tela de bipagem (salva no carregamento).
  const [obs, setObs] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [obsSaved, setObsSaved] = useState(false);
  // "Voltar" leva pra origem (modo celular → /apontar, gestão → /).
  const [backTo, setBackTo] = useState<"/" | "/apontar">("/");
  useEffect(() => {
    setBackTo(homeHref());
  }, []);

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

  // Sincroniza a observação só quando troca de pedido (não a cada recarga da bipagem).
  useEffect(() => {
    setObs(order?.observations ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // Determine if package selector is needed (any product with >1 package types)
  const needsPackageSelector = (() => {
    if (!order) return false;
    const byProduct = new Map<string, number>();
    for (const it of order.items) {
      byProduct.set(it.product_id, (byProduct.get(it.product_id) ?? 0) + 1);
    }
    return Array.from(byProduct.values()).some((n) => n > 1);
  })();

  const processScan = useCallback(async (code: string) => {
    if (!code.trim()) return;
    const result = await addScannedCode(orderId, code.trim(), selectedItemId || null);
    if (result.success && result.scan) {
      const scan = result.scan;
      const status = result.status;
      // Atualização otimista: soma o código na tela na hora, sem reler o pedido inteiro.
      setOrder((prev) =>
        prev ? { ...prev, status: status ?? prev.status, scannedCodes: [...prev.scannedCodes, scan] } : prev
      );
      setFeedback({ type: "success", message: `✓ Pacote ${code} registrado` });
      // Auto-clear selection if this item just got full
      if (selectedItemId && order) {
        const item = order.items.find((i) => i.id === selectedItemId);
        if (item) {
          const scannedNow = order.scannedCodes.filter((s) => s.item_id === item.id).length + 1;
          if (scannedNow >= item.quantity) setSelectedItemId("");
        }
      }
    } else {
      setFeedback({ type: "error", message: result.error || "Erro" });
    }
    setTimeout(() => setFeedback(null), 3000);
  }, [orderId, selectedItemId, order]);

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
      // Sem código digitado/bipado: "Registrar código" abre a câmera pra escanear o código de barras.
      await requestCameraAndOpenScanner();
      return;
    }
    if (needsPackageSelector && !selectedItemId) {
      setFeedback({ type: "error", message: "Selecione qual pacote está sendo bipado" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    await processScan(code);
    setBarcodeInput("");
    inputRef.current?.focus();
  }, [barcodeInput, processScan, requestCameraAndOpenScanner, needsPackageSelector, selectedItemId]);

  const handleCameraScan = useCallback(async (code: string) => {
    setShowScanner(false);
    await processScan(code);
  }, [processScan]);

  const handleSaveObs = useCallback(async () => {
    setSavingObs(true);
    const r = await updateOrderObservations(orderId, obs);
    setSavingObs(false);
    if (r.success) {
      setObsSaved(true);
      setTimeout(() => setObsSaved(false), 2000);
      await loadOrder();
    } else {
      setFeedback({ type: "error", message: r.error || "Erro ao salvar observação" });
      setTimeout(() => setFeedback(null), 3000);
    }
  }, [orderId, obs, loadOrder]);

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

  const handleReopen = useCallback(async () => {
    if (!reopenReason.trim()) return;
    setReopening(true);
    const result = await reopenOrder(orderId, reopenReason.trim());
    if (result.success) {
      setShowReopenDialog(false);
      setReopenReason("");
      await loadOrder();
    } else {
      setFeedback({ type: "error", message: result.error || "Erro ao reabrir" });
      setTimeout(() => setFeedback(null), 3000);
    }
    setReopening(false);
  }, [reopenReason, orderId, loadOrder]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!order) {
    return (
      <Card className="max-w-lg mx-auto text-center p-8">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">Pedido não encontrado</p>
        {onClose ? (
          <Button variant="outline" className="mt-4" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        ) : (
          <Link to={backTo} className="mt-4 inline-block">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          </Link>
        )}
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
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        ) : (
          <Link to={backTo}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      {/* Coluna esquerda: informações + progresso */}
      <div className="space-y-4 lg:col-span-1">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Detalhes do Carregamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
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
                    {item.city && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{item.city}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    {item.quantity} pct
                    {item.units_per_package > 1 && ` × ${item.units_per_package} und`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 border-t pt-3 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <FileText className="h-3 w-3" />Observação
            </span>
            {isComplete ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.observations || "—"}</p>
            ) : (
              <>
                <Textarea
                  rows={2}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Anote algo sobre este carregamento..."
                />
                <div className="flex items-center gap-2">
                  {obs !== (order.observations ?? "") && (
                    <Button size="sm" onClick={handleSaveObs} disabled={savingObs}>
                      {savingObs ? "Salvando..." : "Salvar observação"}
                    </Button>
                  )}
                  {obsSaved && <span className="text-xs text-success">Salvo ✓</span>}
                </div>
              </>
            )}
          </div>
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
      </div>

      {/* Coluna direita: bipagem + códigos */}
      <div className="space-y-4 lg:col-span-2">
      {!isComplete ? (
        <Card className="border-primary/30">
          <CardContent className="pt-6 space-y-4">
            {showScanner && (
              <BarcodeScanner ref={scannerRef} onScan={handleCameraScan} onClose={closeScanner} />
            )}
            <form onSubmit={handleScan} className="space-y-3">
              {needsPackageSelector && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Pacote sendo bipado</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                  >
                    <option value="">Selecione o pacote...</option>
                    {order.items.map((item) => {
                      const scanned = order.scannedCodes.filter((s) => s.item_id === item.id).length;
                      const full = scanned >= item.quantity;
                      const cityLabel = item.city ? ` — ${item.city}` : "";
                      return (
                        <option key={item.id} value={item.id} disabled={full}>
                          {item.package_label ? `[${item.package_label}] ` : ""}{item.product?.name ?? "Produto"}{cityLabel} ({scanned}/{item.quantity}){full ? " ✓ COMPLETO" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
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
              <Button type="submit" className="w-full">
                <ScanBarcode className="h-4 w-4 mr-2" />Registrar código
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => photoRef.current?.openCamera()}>
                  <Camera className="h-4 w-4 mr-2" />Câmera
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => photoRef.current?.openGallery()}>
                  <ImagePlus className="h-4 w-4 mr-2" />Galeria
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
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Link to="/report/$orderId" params={{ orderId }}>
                <Button size="lg">
                  <FileText className="h-4 w-4 mr-2" />Ver Relatório para Impressão
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => setShowReopenDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />Reabrir para Ajuste
              </Button>
            </div>
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
            <div className="max-h-64 overflow-y-auto space-y-1">
              {order.scannedCodes.map((scan, i) => (
                <div key={scan.id} className="flex items-center justify-between gap-2 py-1.5 px-3 rounded-md bg-secondary/50 text-sm">
                  <span className="text-muted-foreground w-8 shrink-0">#{i + 1}</span>
                  {scan.package_label && (
                    <span className="text-xs font-semibold text-primary shrink-0">[{scan.package_label}]</span>
                  )}
                  <span className="font-mono font-medium flex-1 truncate">{scan.barcode}</span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{formatDateTimeBR(scan.scanned_at)}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  {!isComplete && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveScan(scan.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
      </div>

      {/* Registro fotográfico — adicionado pelos botões Câmera/Galeria da bipagem (inclusive no celular). */}
      <PhotoCapture ref={photoRef} orderId={orderId} locked={isComplete} hideButtons />

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

      <EditOrderDialog order={order} open={showEditDialog} onOpenChange={setShowEditDialog} onSaved={loadOrder} />

      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir Carregamento para Ajuste</DialogTitle>
            <DialogDescription>
              O carregamento volta para "Em andamento" pra bipar, remover códigos ou editar dados.
              A data de saída não é alterada. Informe o motivo do ajuste.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Informe o motivo..."
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReopenDialog(false); setReopenReason(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleReopen} disabled={!reopenReason.trim() || reopening}>
              {reopening ? "Reabrindo..." : "Confirmar Reabertura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
