-- Allow customers to view all driver vehicles for booking purposes
-- Uses the has_role function to check if user has 'user' role
CREATE POLICY "Customers can view all driver vehicles"
ON public.driver_vehicles
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'user'::app_role)
);