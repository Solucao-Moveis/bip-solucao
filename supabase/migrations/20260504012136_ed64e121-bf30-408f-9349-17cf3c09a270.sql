CREATE POLICY "Allow public delete products"
ON public.products
FOR DELETE
TO anon
USING (true);