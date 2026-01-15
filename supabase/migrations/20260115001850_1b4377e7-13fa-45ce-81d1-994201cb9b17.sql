CREATE POLICY "assigned_driver_updates"
ON public.deliveries
FOR UPDATE
USING (
  driver_id = auth.uid()
)
WITH CHECK (
  driver_id = auth.uid()
);