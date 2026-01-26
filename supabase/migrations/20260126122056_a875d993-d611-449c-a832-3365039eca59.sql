CREATE OR REPLACE FUNCTION public.create_delivery(
  pickup_location text,
  delivery_location text,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  item_type text,
  quantity integer,
  vehicle_type text,
  price numeric,
  receipt_url text,
  payment_intent_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delivery_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO deliveries (
    customer_id,
    pickup_location,
    delivery_location,
    pickup_lat,
    pickup_lng,
    delivery_lat,
    delivery_lng,
    item_type,
    quantity,
    vehicle_type,
    price,
    receipt_url,
    payment_intent_id,
    status
  )
  VALUES (
    auth.uid(),
    pickup_location,
    delivery_location,
    pickup_lat,
    pickup_lng,
    delivery_lat,
    delivery_lng,
    item_type,
    quantity,
    vehicle_type,
    price,
    receipt_url,
    payment_intent_id,
    'pending'
  )
  RETURNING id INTO v_delivery_id;

  RETURN v_delivery_id;
END;
$$;