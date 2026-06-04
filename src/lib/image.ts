// Compressão de imagem no navegador (canvas).
// O Supabase self-hosted (EasyPanel) não tem serviço de transformação de imagem,
// então redimensionamos/recomprimimos a foto AQUI antes de subir e geramos uma
// miniatura separada. Assim a câmera não despeja arquivos de 9 MB no storage.

export interface CompressOptions {
  /** Maior lado da imagem em px (o menor é proporcional). */
  maxDim?: number;
  /** Qualidade JPEG (0..1). */
  quality?: number;
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function decode(file: Blob): Promise<Decoded> {
  // createImageBitmap respeita a orientação EXIF da câmera ("from-image").
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, cleanup: () => bmp.close() };
    } catch {
      /* navegador sem suporte → cai no <img> */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao decodificar a imagem"));
    img.src = url;
  });
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    cleanup: () => URL.revokeObjectURL(url),
  };
}

/**
 * Redimensiona e recomprime para JPEG. Em qualquer falha devolve o arquivo
 * original (nunca bloqueia o upload).
 */
export async function compressImage(file: Blob, opts: CompressOptions = {}): Promise<Blob> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.72;

  let dec: Decoded;
  try {
    dec = await decode(file);
  } catch {
    return file;
  }

  try {
    if (!dec.width || !dec.height) return file;
    const scale = Math.min(1, maxDim / Math.max(dec.width, dec.height));
    const w = Math.max(1, Math.round(dec.width * scale));
    const h = Math.max(1, Math.round(dec.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(dec.source, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    return blob && blob.size > 0 ? blob : file;
  } finally {
    dec.cleanup();
  }
}
