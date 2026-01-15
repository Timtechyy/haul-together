CREATE POLICY "driver_accepts_once"
ON public.deliveries
FOR UPDATE
USING (
  status = 'pending'
  AND driver_id IS NULL
)
WITH CHECK (
  driver_id = auth.uid()
  AND status = 'accepted'
);