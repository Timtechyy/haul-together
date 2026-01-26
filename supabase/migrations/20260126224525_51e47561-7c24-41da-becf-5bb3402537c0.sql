-- Drop the dependent RLS policy first
DROP POLICY IF EXISTS "Drivers cannot read declined delivery" ON deliveries;

-- Alter the column type
ALTER TABLE deliveries
ALTER COLUMN declined_driver_ids
TYPE uuid[]
USING declined_driver_ids::uuid[];

-- Recreate the RLS policy
CREATE POLICY "Drivers cannot read declined delivery"
ON deliveries
FOR SELECT
USING (
  (auth.uid() IS NOT NULL)
  AND (
    (declined_driver_ids IS NULL)
    OR (NOT (auth.uid() = ANY(declined_driver_ids)))
  )
);