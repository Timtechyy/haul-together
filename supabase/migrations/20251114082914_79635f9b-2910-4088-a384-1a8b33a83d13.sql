-- Create bookingReceipts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bookingReceipts',
  'bookingReceipts',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policy: Customers can upload their own receipts
CREATE POLICY "Customers can upload their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bookingReceipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Customers can view their own receipts
CREATE POLICY "Customers can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bookingReceipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Drivers can view receipts for deliveries assigned to them
CREATE POLICY "Drivers can view receipts for assigned deliveries"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bookingReceipts'
  AND EXISTS (
    SELECT 1 FROM deliveries
    WHERE deliveries.driver_id = auth.uid()
    AND deliveries.customer_id::text = (storage.foldername(name))[1]
  )
);

-- Add receipt_url column to deliveries table
ALTER TABLE deliveries
ADD COLUMN receipt_url TEXT;

-- Add additional booking details columns
ALTER TABLE deliveries
ADD COLUMN item_type TEXT,
ADD COLUMN quantity INTEGER,
ADD COLUMN vehicle_type TEXT;