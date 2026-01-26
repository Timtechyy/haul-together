DROP FUNCTION IF EXISTS public.create_delivery(text, text, double precision, double precision, double precision, double precision, text, text, numeric, integer, text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.create_delivery(
  pickup_location text,
  delivery_location text,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  item_type text,
  item_description text,
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
  v_estimated_distance double precision;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate distance internally
  v_estimated_distance :=
    public.distance_calculator(
      pickup_lat,
      pickup_lng,
      delivery_lat,
      delivery_lng
    );

  INSERT INTO deliveries (
    customer_id,
    pickup_location,
    delivery_location,
    pickup_lat,
    pickup_lng,
    delivery_lat,
    delivery_lng,
    estimated_distance,
    item_type,
    item_description,
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
    v_estimated_distance,
    item_type,
    item_description,
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