
-- Products catalog table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loading orders table
CREATE TABLE public.loading_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  driver TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  loading_date DATE NOT NULL,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scanned codes table
CREATE TABLE public.scanned_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.loading_orders(id) ON DELETE CASCADE NOT NULL,
  barcode TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, barcode)
);

-- Allow public access (warehouse system, no auth needed)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanned_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert products" ON public.products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update products" ON public.products FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read loading_orders" ON public.loading_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert loading_orders" ON public.loading_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update loading_orders" ON public.loading_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read scanned_codes" ON public.scanned_codes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert scanned_codes" ON public.scanned_codes FOR INSERT TO anon WITH CHECK (true);
