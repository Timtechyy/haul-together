CREATE POLICY "customers_can_view_assigned_driver_profile"
ON profiles
FOR SELECT
USING (
  id IN (
    SELECT driver_id
    FROM deliveries
    WHERE customer_id = auth.uid()
  )
);