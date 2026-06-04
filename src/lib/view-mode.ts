// Modo de uso do Bip: "mobile" (apontamento enxuto, aberto pelo ERP no celular)
// ou "desktop" (gestão completa). Guardado no localStorage para que a navegação
// interna (ex.: "Voltar" da tela de bipagem) respeite de onde a pessoa entrou.

const KEY = "bip:mode";
export type ViewMode = "mobile" | "desktop";

export function setViewMode(mode: ViewMode) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}

export function getViewMode(): ViewMode {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "mobile") {
      return "mobile";
    }
  } catch {
    /* ignore */
  }
  return "desktop";
}

/** Rota inicial conforme o modo atual. */
export function homeHref(): "/apontar" | "/" {
  return getViewMode() === "mobile" ? "/apontar" : "/";
}
