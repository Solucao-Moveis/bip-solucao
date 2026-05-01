
-- Create junction table for multiple products per order
CREATE TABLE public.loading_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.loading_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loading_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access like other tables)
CREATE POLICY "Allow public read loading_order_items"
ON public.loading_order_items FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public insert loading_order_items"
ON public.loading_order_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public delete loading_order_items"
ON public.loading_order_items FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public update loading_order_items"
ON public.loading_order_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Migrate existing data: copy product_id and quantity from loading_orders to the new items table
INSERT INTO public.loading_order_items (order_id, product_id, quantity)
SELECT id, product_id, quantity FROM public.loading_orders WHERE product_id IS NOT NULL;
