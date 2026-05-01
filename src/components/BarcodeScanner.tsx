import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const hasScannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const containerId = "barcode-scanner-container";

  // Keep the callback ref up to date without restarting the scanner
  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
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

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          if (cancelled || hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScanRef.current(decodedText);
        },
        () => {}
      )
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Camera error:", err);
          setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
          setStarting(false);
        }
      });

    return () => {
      cancelled = true;
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
      {starting && (
        <p className="text-sm text-muted-foreground text-center">Iniciando câmera...</p>
      )}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
