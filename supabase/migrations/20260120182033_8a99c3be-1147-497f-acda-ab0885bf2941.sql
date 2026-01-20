DROP POLICY IF EXISTS "realtime_test" ON driver_vehicles;

CREATE POLICY "driver_location_realtime"
ON driver_vehicles
FOR SELECT
USING (true);