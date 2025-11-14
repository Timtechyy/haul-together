-- Remove the policy that allows anyone to view all driver vehicles
DROP POLICY IF EXISTS "Anyone can view driver vehicles" ON driver_vehicles;