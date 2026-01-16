DROP POLICY IF EXISTS "drivers_visible_profiles" ON profiles;

CREATE POLICY "profiles_visible_for_getting_driver"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM driver_vehicles dv
    WHERE dv.user_id = profiles.id
  )
);