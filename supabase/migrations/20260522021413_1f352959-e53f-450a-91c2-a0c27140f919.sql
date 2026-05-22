ALTER TABLE public.scanned_codes ADD COLUMN IF NOT EXISTS item_id uuid;
CREATE INDEX IF NOT EXISTS idx_scanned_codes_item_id ON public.scanned_codes(item_id);