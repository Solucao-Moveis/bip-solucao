// Geração do PDF do "Registro de Carregamento" — réplica do formulário em papel.
// Desenho VETORIAL com jsPDF (sem html2canvas): evita problemas de cor do tema e gera multipágina.
import { jsPDF } from "jspdf";
import logo from "@/assets/logo-solucao-moveis.png";
import type { Loading } from "@/lib/cargas-store";

function fmtDate(d?: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y.slice(2)}`;
}

function fmtQty(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
}

export function loadingFilename(l: Loading): string {
  const base = (l.load_number || l.id.slice(0, 8)).replace(/[\\/:*?"<>|]+/g, "-");
  return `Carregamento-${base}.pdf`;
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateLoadingPdf(l: Loading): Promise<Blob> {
  const logoData = await toDataUrl(logo);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const M = 8;
  const X0 = M;
  const W = 194;
  const XR = X0 + W;
  const PAGE_BOTTOM = 288;
  let y = M;

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);

  // ---------------- Cabeçalho ----------------
  const headH = 20;
  const logoW = 40;
  const infoW = 60;
  const titleW = W - logoW - infoW;
  doc.setFillColor(43, 43, 43);
  doc.rect(X0, y, logoW, headH, "F");
  if (logoData) {
    try { doc.addImage(logoData, "PNG", X0 + 5, y + 6, 30, 8); } catch { /* logo opcional */ }
  }
  doc.rect(X0 + logoW, y, titleW, headH);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REGISTRO DE CARREGAMENTO", X0 + logoW + titleW / 2, y + headH / 2 + 1.5, { align: "center", maxWidth: titleW - 4 });
  const ix = X0 + logoW + titleW;
  const rowH3 = headH / 3;
  doc.rect(ix, y, infoW, headH);
  doc.line(ix, y + rowH3, ix + infoW, y + rowH3);
  doc.line(ix, y + rowH3 * 2, ix + infoW, y + rowH3 * 2);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CARGA Nº:", ix + 1.5, y + 4.3);
  doc.text("DATA:", ix + 1.5, y + rowH3 + 4.3);
  doc.text("HORA:", ix + 1.5, y + rowH3 * 2 + 4.3);
  doc.setFont("helvetica", "normal");
  doc.text(l.load_number ?? "", ix + 16, y + 4.3, { maxWidth: infoW - 17 });
  const dataStr = [fmtDate(l.start_date), fmtDate(l.end_date)].filter(Boolean).join(" — ");
  const horaStr = [l.start_time, l.end_time].filter(Boolean).join(" — ");
  doc.text(dataStr, ix + 12, y + rowH3 + 4.3, { maxWidth: infoW - 13 });
  doc.text(horaStr, ix + 12, y + rowH3 * 2 + 4.3, { maxWidth: infoW - 13 });
  y += headH;

  // ---------------- Motorista / Placa ----------------
  const drvH = 7;
  const cW = W / 2;
  const labeled = (x: number, label: string, value: string) => {
    doc.rect(x, y, cW, drvH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(label, x + 2, y + 4.7);
    const lw = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    doc.text(value || "", x + 2 + lw + 1.5, y + 4.7, { maxWidth: cW - lw - 5 });
  };
  labeled(X0, "MOTORISTA:", l.driver_name ?? "");
  labeled(X0 + cW, "PLACA:", l.vehicle_plate ?? "");
  y += drvH;

  // ---------------- Colunas ----------------
  const xCode = X0;
  const xDesc = 30;
  const xPed = 126;
  const xSol = 144;
  const xReal = 162;
  const xNf = 180;
  const wDesc = xPed - xDesc;
  const colLine = (yy: number, h: number) => { [xDesc, xPed, xSol, xReal, xNf].forEach((x) => doc.line(x, yy, x, yy + h)); };
  const cx = (a: number, b: number) => (a + b) / 2;

  const colsHeader = (yy: number): number => {
    const hH = 7;
    doc.setFillColor(233, 233, 233);
    doc.rect(X0, yy, W, hH, "F");
    doc.rect(X0, yy, W, hH);
    colLine(yy, hH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("CÓDIGO", cx(xCode, xDesc), yy + 4.4, { align: "center" });
    doc.text("DESCRIÇÃO", cx(xDesc, xPed), yy + 4.4, { align: "center" });
    doc.text("PEDIDO", cx(xPed, xSol), yy + 4.4, { align: "center" });
    doc.text("SOLIC.", cx(xSol, xReal), yy + 4.4, { align: "center" });
    doc.text("REAL", cx(xReal, xNf), yy + 4.4, { align: "center" });
    doc.text("NF", cx(xNf, XR), yy + 4.4, { align: "center" });
    return yy + hH;
  };

  let currentDest = "";
  const paintDestBar = (title: string, yy: number): number => {
    const bh = 6;
    doc.setFillColor(220, 230, 222);
    doc.rect(X0, yy, W, bh, "F");
    doc.rect(X0, yy, W, bh);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(title, X0 + 2, yy + 4.2);
    return yy + bh;
  };
  const ensurePlain = (h: number) => { if (y + h > PAGE_BOTTOM) { doc.addPage(); y = M; } };
  const ensure = (h: number) => {
    if (y + h > PAGE_BOTTOM) {
      doc.addPage();
      y = M;
      y = colsHeader(y);
      if (currentDest) y = paintDestBar(currentDest + " (cont.)", y);
    }
  };
  const destBar = (title: string) => {
    currentDest = title;
    if (y + 20 > PAGE_BOTTOM) { doc.addPage(); y = M; y = colsHeader(y); }
    y = paintDestBar(title, y);
  };

  y = colsHeader(y);
  const lineH = 3.5;

  for (const dest of l.destinations) {
    const cityLabel = [dest.city, dest.uf].filter(Boolean).join("/");
    destBar(cityLabel || "DESTINO");
    for (const it of dest.items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const descLines = doc.splitTextToSize(it.description ?? "", wDesc - 3) as string[];
      const rowH = Math.max(7, descLines.length * lineH + 3);
      ensure(rowH);
      doc.rect(X0, y, W, rowH);
      colLine(y, rowH);
      doc.text(it.code ?? "", xCode + 1.5, y + 4.4, { maxWidth: xDesc - xCode - 2 });
      doc.text(descLines, xDesc + 1.5, y + 4.0);
      doc.text(it.order_number ?? "", cx(xPed, xSol), y + 4.4, { align: "center", maxWidth: xSol - xPed - 2 });
      doc.text(fmtQty(it.qty_planned), cx(xSol, xReal), y + 4.4, { align: "center", maxWidth: xReal - xSol - 2 });
      doc.setFont("helvetica", "bold");
      doc.text(fmtQty(it.qty_actual), cx(xReal, xNf), y + 4.4, { align: "center", maxWidth: xNf - xReal - 2 });
      doc.setFont("helvetica", "normal");
      doc.text(it.invoice ?? "", cx(xNf, XR), y + 4.4, { align: "center", maxWidth: XR - xNf - 2 });
      y += rowH;
    }
  }

  // ---------------- Rodapé ----------------
  y += 2;
  const footRow = (label: string, value: string, h = 7) => {
    doc.rect(X0, y, W, h);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(label, X0 + 2, y + 4.7);
    const lw = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    doc.text(value || "", X0 + 2 + lw + 1.5, y + 4.7, { maxWidth: W - lw - 5 });
    y += h;
  };
  const obsLines = doc.splitTextToSize(l.observations ?? "", W - 6) as string[];
  const obsH = Math.max(14, obsLines.length * lineH + 7);
  ensurePlain(obsH + 27);
  doc.rect(X0, y, W, obsH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("OBSERVAÇÕES:", X0 + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(obsLines, X0 + 2, y + 9.5);
  y += obsH;
  footRow("CARREGAMENTO:", l.load_type ?? "");
  footRow("EMPENHO:", l.empenho ?? "");
  footRow("ENTREGA:", l.entrega ?? "");

  // ---------------- Assinatura ----------------
  ensurePlain(34);
  y += 22;
  const cxPage = 105;
  const halfLine = 58;
  if (l.signed_by_name) {
    doc.setFont("times", "italic");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(l.signed_by_name, cxPage, y, { align: "center", maxWidth: halfLine * 2 - 6 });
  }
  doc.setLineWidth(0.5);
  doc.line(cxPage - halfLine, y + 2.5, cxPage + halfLine, y + 2.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  const sigLegend = l.signed_by_name ? `Assinante: ${l.signed_by_name}  ·  Assinatura do responsável` : "Assinatura do responsável";
  doc.text(sigLegend, cxPage, y + 7.5, { align: "center" });

  // ---------------- Rodapé fixo ----------------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Registro de Carregamento — Solução Móveis${l.load_number ? "   |   Carga " + l.load_number : ""}   ·   Pág. ${p}/${pageCount}`,
      XR, 293, { align: "right" },
    );
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
