ALTER TABLE driver_vehicles
ADD CONSTRAINT fk_driver_vehicles_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id);