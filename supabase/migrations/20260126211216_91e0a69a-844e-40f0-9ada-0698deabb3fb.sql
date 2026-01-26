CREATE POLICY "Drivers cannot read declined delivery"
ON public.deliveries
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    declined_driver_ids IS NULL
    OR NOT (auth.uid() = ANY(declined_driver_ids))
  )
);