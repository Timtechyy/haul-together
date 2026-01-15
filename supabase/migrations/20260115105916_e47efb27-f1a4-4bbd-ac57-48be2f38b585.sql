CREATE OR REPLACE FUNCTION public.driver_confirm_delivery(delivery_id uuid)
RETURNS deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d deliveries;
BEGIN
  UPDATE deliveries
  SET
    driver_confirmed_at = now(),
    status = CASE
      WHEN customer_confirmed_at IS NOT NULL THEN 'completed'
      ELSE 'awaiting_confirmation'
    END,
    completed_at = CASE
      WHEN customer_confirmed_at IS NOT NULL THEN now()
      ELSE NULL
    END
  WHERE
    id = delivery_id
    AND driver_id = auth.uid()
    AND status IN ('accepted', 'in_progress', 'awaiting_confirmation')
  RETURNING * INTO d;

  IF d.completed_at IS NOT NULL THEN
    PERFORM release_escrow(d.id);
  END IF;

  RETURN d;
END;
$$;