ALTER TABLE deliveries
ADD CONSTRAINT fk_deliveries_driver_profile
FOREIGN KEY (driver_id)
REFERENCES profiles(id);