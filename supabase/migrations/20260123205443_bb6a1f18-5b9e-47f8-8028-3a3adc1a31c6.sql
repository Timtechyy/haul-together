CREATE POLICY "Customer can confirm delivery"
ON public.deliveries
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);