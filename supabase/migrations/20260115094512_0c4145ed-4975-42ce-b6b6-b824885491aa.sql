DROP POLICY IF EXISTS "driver_accepts_once" ON public.deliveries;

CREATE POLICY "driver_accepts_if_not_busy"
ON public.deliveries
FOR UPDATE
USING (
  status = 'pending'
  AND driver_id IS NULL
)
WITH CHECK (
  driver_id = auth.uid()
  AND status = 'accepted'
  AND NOT EXISTS (
    SELECT 1
    FROM deliveries d
    WHERE d.driver_id = auth.uid()
      AND d.status IN ('accepted', 'in_progress')
  )
);