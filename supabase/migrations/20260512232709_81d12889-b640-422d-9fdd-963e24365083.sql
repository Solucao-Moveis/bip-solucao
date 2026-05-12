
ALTER TABLE public.loading_orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.loading_order_items ADD COLUMN IF NOT EXISTS package_label TEXT;
ALTER TABLE public.scanned_codes ADD COLUMN IF NOT EXISTS product_id UUID;
DROP POLICY IF EXISTS "Allow public delete scanned_codes" ON public.scanned_codes;
CREATE POLICY "Allow public delete scanned_codes" ON public.scanned_codes FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Allow public update scanned_codes" ON public.scanned_codes;
CREATE POLICY "Allow public update scanned_codes" ON public.scanned_codes FOR UPDATE TO anon USING (true) WITH CHECK (true);
