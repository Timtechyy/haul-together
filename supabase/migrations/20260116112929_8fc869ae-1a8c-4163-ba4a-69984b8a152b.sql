-- Drop the public read policy
DROP POLICY IF EXISTS "public_read_profiles" ON profiles;

-- Create policy to only show driver profiles
CREATE POLICY "drivers_visible_profiles"
ON profiles
FOR SELECT
USING (
  id IN (
    SELECT user_id FROM driver_vehicles
  )
);