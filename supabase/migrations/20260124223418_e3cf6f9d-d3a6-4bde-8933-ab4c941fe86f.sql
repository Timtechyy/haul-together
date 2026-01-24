-- Drop existing function
DROP FUNCTION IF EXISTS public.customer_confirm_delivery(uuid);

-- Create updated function with simplified logic
CREATE OR REPLACE FUNCTION public.customer_confirm_delivery(
  p_delivery_id uuid
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

  -- Ensure caller is the delivery owner
  IF NOT EXISTS (
    SELECT 1
    FROM deliveries
    WHERE id = p_delivery_id
      AND customer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not the owner of this delivery';
  END IF;

  UPDATE deliveries
  SET customer_confirmed_at = now()
  WHERE id = p_delivery_id;
END;
$$;