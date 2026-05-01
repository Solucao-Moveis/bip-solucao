import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Product } from "@/lib/loading-store";

interface BarcodeLabelProps {
  product: Product;
  onClose: () => void;
}

export function BarcodeLabel({ product, onClose }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, product.code, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        textMargin: 6,
      });
    }
  }, [product.code]);

  const handlePrint = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${product.name}</title>
        <style>
          @page { size: 100mm 50mm; margin: 2mm; }
          body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; }
          .label { text-align: center; }
          .product-name { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
          .product-desc { font-size: 9px; color: #666; margin-bottom: 6px; }
          svg { max-width: 90mm; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="product-name">${product.name}</div>
          ${product.description ? `<div class="product-desc">${product.description}</div>` : ""}
          ${svgStr}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="text-center">
        <p className="font-semibold text-sm">{product.name}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground">{product.description}</p>
        )}
      </div>
      <div className="flex justify-center bg-white rounded p-2">
        <svg ref={svgRef} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-1" />
          Imprimir Etiqueta
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
