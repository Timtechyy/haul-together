ALTER TABLE deliveries
ADD COLUMN declined_driver_ids uuid[] DEFAULT '{}';