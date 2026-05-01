
CREATE POLICY "Allow public delete scanned_codes"
ON public.scanned_codes
FOR DELETE
TO anon
USING (true);

CREATE POLICY "Allow public delete loading_orders"
ON public.loading_orders
FOR DELETE
TO anon
USING (true);
