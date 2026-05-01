import { forwardRef, useEffect, useImperativeHandle, useId, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export interface BarcodeScannerHandle {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export const BarcodeScanner = forwardRef<BarcodeScannerHandle, BarcodeScannerProps>(function BarcodeScanner({ onScan, onClose }, ref) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const hasScannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const reactId = useId();
  const containerId = `barcode-scanner-${reactId.replace(/:/g, "")}`;

  // Keep the callback ref up to date without restarting the scanner
  onScanRef.current = onScan;

  const stopScanner = useCallback(async (targetScanner?: Html5Qrcode | null) => {
    const scanner = targetScanner ?? scannerRef.current;
    if (!scanner) return;

    try {
      const state = scanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scanner.stop();
      }
    } catch (err) {
      console.warn("Scanner stop skipped:", err);
    }
  }, []);

  const startScanner = useCallback(async () => {
    const scanner = scannerRef.current ?? new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    hasScannedRef.current = false;
    setError(null);
    setStarting(true);

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          void stopScanner(scanner).finally(() => onScanRef.current(decodedText));
        },
        () => {},
      );
    } catch (err) {
      console.error("Camera error:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      throw err;
    } finally {
      setStarting(false);
    }
  }, [containerId, stopScanner]);

  useImperativeHandle(ref, () => ({
    start: startScanner,
    stop: () => stopScanner(),
  }), [startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" /> Scanner de Código de Barras
        </span>
        <Button variant="ghost" size="icon" onClick={() => void stopScanner().finally(onClose)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div
        id={containerId}
        className="w-full rounded-md overflow-hidden border border-border"
        style={{ minHeight: 250 }}
      />
      {starting && <p className="text-sm text-muted-foreground text-center">Iniciando câmera...</p>}
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
});
