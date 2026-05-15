CREATE TABLE public.loading_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loading_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read photos" ON public.loading_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert photos" ON public.loading_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update photos" ON public.loading_photos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete photos" ON public.loading_photos FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_loading_photos_order ON public.loading_photos(order_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('loading-photos', 'loading-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read loading photos" ON storage.objects FOR SELECT USING (bucket_id = 'loading-photos');
CREATE POLICY "Auth upload loading photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'loading-photos');
CREATE POLICY "Auth delete loading photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'loading-photos');