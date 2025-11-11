-- Allow all authenticated users to view driver vehicle information
-- This is needed so customers can see available vehicle types when booking
CREATE POLICY "Anyone can view driver vehicles"
ON driver_vehicles
FOR SELECT
TO authenticated
USING (true);