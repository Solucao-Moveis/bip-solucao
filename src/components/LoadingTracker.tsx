import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getOrder, addScannedCode, type LoadingOrder } from "@/lib/loading-store";
import { ScanBarcode, Package, CheckCircle2, XCircle, Truck, User, Calendar, AlertTriangle, ArrowLeft, Hash } from "lucide-react";

export function LoadingTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<LoadingOrder | undefined>();
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadOrder = async () => {
    const o = await getOrder(orderId);
    setOrder(o);
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

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

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const result = await addScannedCode(orderId, code);
    if (result.success) {
      setFeedback({ type: "success", message: `✓ Pacote ${code} registrado` });
      await loadOrder();
    } else {
      setFeedback({ type: "error", message: result.error || "Erro" });
    }
    setBarcodeInput("");
    inputRef.current?.focus();

    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
        <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-success text-success-foreground" : ""}>
          {isComplete ? "Finalizado" : "Em andamento"}
        </Badge>
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
              <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Produto</span>
              <p className="font-medium">{order.product?.name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Quantidade</span>
              <p className="font-medium">{order.quantity} pacotes</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Motorista</span>
              <p className="font-medium">{order.driver}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" />Placa</span>
              <p className="font-medium">{order.vehiclePlate}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Data</span>
              <p className="font-medium">{new Date(order.loadingDate).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
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
          <CardContent className="pt-6">
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
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
              <Button type="submit">Registrar</Button>
            </form>
            {feedback && (
              <div className={`mt-3 flex items-center gap-2 rounded-md p-3 text-sm font-medium ${feedback.type === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {feedback.message}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">Carregamento Finalizado!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os {order.quantity} pacotes foram registrados com sucesso.
            </p>
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
    </div>
  );
}
