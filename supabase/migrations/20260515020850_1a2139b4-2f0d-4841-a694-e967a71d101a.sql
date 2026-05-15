
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Auto-create profile + first user becomes admin if email matches
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Auto-promote known admin email
  IF NEW.email = 'joao.santana@solucaomoveis.ind.br' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies: profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: audit_log
CREATE POLICY "Admins view all audit" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Restrict existing tables to authenticated users only
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert products" ON public.products;
DROP POLICY IF EXISTS "Allow public update products" ON public.products;
DROP POLICY IF EXISTS "Allow public delete products" ON public.products;
CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete products" ON public.products FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read loading_orders" ON public.loading_orders;
DROP POLICY IF EXISTS "Allow public insert loading_orders" ON public.loading_orders;
DROP POLICY IF EXISTS "Allow public update loading_orders" ON public.loading_orders;
DROP POLICY IF EXISTS "Allow public delete loading_orders" ON public.loading_orders;
CREATE POLICY "Auth read orders" ON public.loading_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert orders" ON public.loading_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update orders" ON public.loading_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete orders" ON public.loading_orders FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read loading_order_items" ON public.loading_order_items;
DROP POLICY IF EXISTS "Allow public insert loading_order_items" ON public.loading_order_items;
DROP POLICY IF EXISTS "Allow public update loading_order_items" ON public.loading_order_items;
DROP POLICY IF EXISTS "Allow public delete loading_order_items" ON public.loading_order_items;
CREATE POLICY "Auth read items" ON public.loading_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert items" ON public.loading_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update items" ON public.loading_order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete items" ON public.loading_order_items FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read scanned_codes" ON public.scanned_codes;
DROP POLICY IF EXISTS "Allow public insert scanned_codes" ON public.scanned_codes;
DROP POLICY IF EXISTS "Allow public update scanned_codes" ON public.scanned_codes;
DROP POLICY IF EXISTS "Allow public delete scanned_codes" ON public.scanned_codes;
CREATE POLICY "Auth read scans" ON public.scanned_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert scans" ON public.scanned_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update scans" ON public.scanned_codes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete scans" ON public.scanned_codes FOR DELETE TO authenticated USING (true);
