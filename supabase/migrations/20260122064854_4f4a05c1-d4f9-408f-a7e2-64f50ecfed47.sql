CREATE POLICY "Allow read verified drivers"
ON public.driver_verifications
FOR SELECT
USING (verification_status = 'approved');