-- Drivers can see unassigned pending deliveries
CREATE POLICY "drivers_view_pending"
ON deliveries
FOR SELECT
USING (status = 'pending' AND driver_id IS NULL);

-- Drivers can see their own deliveries
CREATE POLICY "drivers_view_own"
ON deliveries
FOR SELECT
USING (driver_id = auth.uid());