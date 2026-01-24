-- Drop existing function
DROP FUNCTION IF EXISTS public.driver_confirm_delivery(uuid);

-- Create updated function with status parameter
CREATE OR REPLACE FUNCTION public.driver_confirm_delivery(
  p_delivery_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Allowed transitions (basic guard)
  IF p_new_status NOT IN (
    'pending',
    'accepted',
    'picking_up',
    'in_transit',
    'delivered',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE deliveries
  SET
    status = p_new_status,
    picked_up_at = CASE
      WHEN p_new_status = 'picking_up'
      THEN now()
      ELSE picked_up_at
    END,
    delivered_at = CASE
      WHEN p_new_status = 'delivered'
      THEN now()
      ELSE delivered_at
    END,
    driver_confirmed_at = CASE
      WHEN p_new_status = 'delivered'
      THEN now()
      ELSE driver_confirmed_at
    END
  WHERE id = p_delivery_id
    AND driver_id = auth.uid();
END;
$$;