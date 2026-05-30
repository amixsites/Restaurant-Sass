-- Phase 6: Allow public read access to restaurants table for customer QR ordering
CREATE POLICY "Allow public read of restaurants" ON restaurants
  FOR SELECT USING (true);
