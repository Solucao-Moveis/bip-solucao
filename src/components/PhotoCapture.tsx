import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Trash2, ImagePlus } from "lucide-react";
import { getOrderPhotos, uploadOrderPhoto, deleteOrderPhoto, type LoadingPhoto } from "@/lib/photos";

export interface PhotoCaptureHandle {
  openCamera: () => void;
  openGallery: () => void;
}

export const PhotoCapture = forwardRef<
  PhotoCaptureHandle,
  { orderId: string; locked?: boolean; hideButtons?: boolean }
>(function PhotoCapture({ orderId, locked = false, hideButtons = false }, ref) {
  const [photos, setPhotos] = useState<LoadingPhoto[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Permite que a tela de bipagem dispare a câmera/galeria pelos botões de cima.
  useImperativeHandle(ref, () => ({
    openCamera: () => { if (!locked) cameraRef.current?.click(); },
    openGallery: () => { if (!locked) fileRef.current?.click(); },
  }), [locked]);

  const load = async () => setPhotos(await getOrderPhotos(orderId));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
    setCaption("");
    setError("");
    e.target.value = "";
  };

  const onSave = async () => {
    if (!pendingFile) return;
    setBusy(true);
    const r = await uploadOrderPhoto(orderId, pendingFile, caption.trim());
    setBusy(false);
    if (!r.success) { setError(r.error || "Erro ao enviar"); return; }
    setPendingFile(null);
    setPendingPreview("");
    setCaption("");
    await load();
  };

  const onCancel = () => { setPendingFile(null); setPendingPreview(""); setCaption(""); setError(""); };

  const onDelete = async (p: LoadingPhoto) => {
    if (!confirm("Remover esta foto?")) return;
    await deleteOrderPhoto(p);
    await load();
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Registro Fotográfico ({photos.length})
        </CardTitle>
        {!locked && !hideButtons && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-4 w-4 mr-1" />Tirar Foto
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4 mr-1" />Galeria
            </Button>
          </div>
        )}
        <Input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        <Input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma foto registrada.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="relative group">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={p.thumbUrl}
                      alt={p.caption || "Foto"}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== p.url) img.src = p.url;
                      }}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                  </a>
                  {!locked && (
                    <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onDelete(p)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.caption}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!pendingFile} onOpenChange={(o) => !o && onCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar foto ao carregamento</DialogTitle>
          </DialogHeader>
          {pendingPreview && (
            <img src={pendingPreview} alt="Pré-visualização" className="w-full max-h-72 object-contain rounded-md border" />
          )}
          <Textarea
            placeholder="Observação da foto (opcional)..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={onCancel} disabled={busy}>Cancelar</Button>
            <Button onClick={onSave} disabled={busy}>{busy ? "Enviando..." : "Salvar Foto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});
