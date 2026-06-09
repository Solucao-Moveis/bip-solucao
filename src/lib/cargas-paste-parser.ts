// ============================================================
// Parser do "colar" — origem incerta (Excel/planilha OU texto corrido).
// Transforma o texto colado em destinos + itens-rascunho que a pessoa CONFERE
// numa prévia editável antes de inserir (ver PasteImportDialog).
// ============================================================

export interface ParsedItem {
  code: string;
  description: string;
  qty_planned: string;
  order_number: string;
  invoice: string;
}

export interface ParsedDestination {
  city: string;
  uf: string;
  items: ParsedItem[];
}

const CITY_RE = /^([\p{L}][\p{L} .'\-]{1,39})\/([A-Za-z]{2})$/u;
const CODE_RE = /^\d[\dA-Za-z]{4,}$/;
const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

function isNum(s: string): boolean {
  return /^\d{1,7}([.,]\d+)?$/.test(s.trim());
}

export function parseLoadingPaste(raw: string): ParsedDestination[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return [];

  const tabbed = nonEmpty.filter((l) => l.includes("\t")).length;
  const tabMode = tabbed >= Math.max(1, Math.floor(nonEmpty.length * 0.4));

  const dests: ParsedDestination[] = [];
  let cur: ParsedDestination | null = null;

  const ensureDest = (): ParsedDestination => {
    if (!cur) {
      cur = { city: "", uf: "", items: [] };
      dests.push(cur);
    }
    return cur;
  };
  const lastItem = (): ParsedItem | null => {
    if (!cur || cur.items.length === 0) return null;
    return cur.items[cur.items.length - 1];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim() === "") continue;

    const cityM = line.trim().match(CITY_RE);
    if (cityM && !line.includes("\t") && UFS.has(cityM[2].toUpperCase())) {
      cur = { city: cityM[1].trim(), uf: cityM[2].toUpperCase(), items: [] };
      dests.push(cur);
      continue;
    }

    if (tabMode && line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim());
      const code = parts[0] ?? "";
      const description = parts[1] ?? "";
      const qty = parts[2] ?? "";
      const order = parts[3] ?? "";
      const invoice = parts[4] ?? "";
      if (!code && !qty && !order && description) {
        const li = lastItem();
        if (li) {
          li.description = (li.description ? li.description + "\n" : "") + description;
          continue;
        }
      }
      ensureDest().items.push({ code, description, qty_planned: isNum(qty) ? qty : "", order_number: order, invoice });
      continue;
    }

    const m = line.trim().match(/^(\d[\dA-Za-z]{5,})\s+(.*)$/);
    if (m && CODE_RE.test(m[1])) {
      let rest = m[2] ?? "";
      let qty = "";
      let order = "";
      const tail = rest.match(/^(.*\S)\s+(\d{1,6})\s+(\d{1,6})\s*$/);
      if (tail) {
        rest = tail[1];
        qty = tail[2];
        order = tail[3];
      }
      ensureDest().items.push({ code: m[1], description: rest, qty_planned: qty, order_number: order, invoice: "" });
      continue;
    }

    const li = lastItem();
    if (li) li.description = (li.description ? li.description + "\n" : "") + line.trim();
    else ensureDest().items.push({ code: "", description: line.trim(), qty_planned: "", order_number: "", invoice: "" });
  }

  return dests.filter((d) => d.city || d.items.length > 0);
}
