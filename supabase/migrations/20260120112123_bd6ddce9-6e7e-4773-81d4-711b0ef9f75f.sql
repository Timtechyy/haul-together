-- Make bucket private again
UPDATE storage.buckets 
SET public = false 
WHERE id = 'bookingReceipts';

-- Drop existing select policies to recreate with simpler rule
DROP POLICY IF EXISTS "Customers can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can view receipts for assigned deliveries" ON storage.objects;

-- Allow all authenticated users to read from bookingReceipts
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bookingReceipts');