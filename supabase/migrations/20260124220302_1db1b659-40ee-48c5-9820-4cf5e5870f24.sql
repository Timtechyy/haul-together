CREATE OR REPLACE FUNCTION public.distance_calculator(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT 6371 * acos(
    cos(radians(lat1)) * cos(radians(lat2))
    * cos(radians(lng2) - radians(lng1))
    + sin(radians(lat1)) * sin(radians(lat2))
  );
$$;