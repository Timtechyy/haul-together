
-- 1. Re-enable RLS on user_roles with a policy for users to read their own role
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix bookingReceipts storage policy
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;

CREATE POLICY "Customers can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bookingReceipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Drivers can view receipts for assigned deliveries"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bookingReceipts'
  AND EXISTS (
    SELECT 1 FROM public.deliveries
    WHERE deliveries.driver_id = auth.uid()
    AND deliveries.customer_id::text = (storage.foldername(name))[1]
  )
);
