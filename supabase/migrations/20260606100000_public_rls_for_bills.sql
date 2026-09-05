-- Allow public (unauthenticated) access to tables required for viewing a bill via public link.
-- Because all these tables use UUIDs for their primary keys, they act as secure, unguessable tokens.

-- 1. Allow anyone to read invoices
CREATE POLICY "Allow public read access to invoices" ON public.invoices
FOR SELECT USING (true);

-- 2. Allow anyone to read orders
CREATE POLICY "Allow public read access to orders" ON public.orders
FOR SELECT USING (true);

-- 3. Allow anyone to read order items
CREATE POLICY "Allow public read access to order_items" ON public.order_items
FOR SELECT USING (true);

-- 4. Allow anyone to read tables
CREATE POLICY "Allow public read access to tables" ON public.tables
FOR SELECT USING (true);

-- 5. Allow anyone to read restaurants (also needed for customer QR menu)
CREATE POLICY "Allow public read access to restaurants" ON public.restaurants
FOR SELECT USING (true);

-- 6. Allow anyone to read menu items (also needed for customer QR menu)
CREATE POLICY "Allow public read access to menu_items" ON public.menu_items
FOR SELECT USING (true);
