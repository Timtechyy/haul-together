-- Create driver_vehicles table
CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_type text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text NOT NULL,
  insurance_number text,
  tracking_consent boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create driver_verifications table
CREATE TABLE IF NOT EXISTS public.driver_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  ssn_last_four text NOT NULL,
  license_number text NOT NULL,
  license_state text NOT NULL,
  license_front_url text,
  license_back_url text,
  verification_status text DEFAULT 'pending' NOT NULL CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  veriff_session_id text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create deliveries table for tracking
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_location text NOT NULL,
  delivery_location text NOT NULL,
  pickup_lat decimal(10, 8),
  pickup_lng decimal(11, 8),
  delivery_lat decimal(10, 8),
  delivery_lng decimal(11, 8),
  item_description text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'picking_up', 'in_transit', 'delivered', 'cancelled')),
  price decimal(10, 2),
  estimated_distance decimal(10, 2),
  accepted_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for driver_vehicles
CREATE POLICY "Users can view their own vehicle info"
  ON public.driver_vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicle info"
  ON public.driver_vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicle info"
  ON public.driver_vehicles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for driver_verifications
CREATE POLICY "Users can view their own verification"
  ON public.driver_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification"
  ON public.driver_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification"
  ON public.driver_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for deliveries
CREATE POLICY "Customers can view their own deliveries"
  ON public.deliveries FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = driver_id);

CREATE POLICY "Customers can create deliveries"
  ON public.deliveries FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Drivers can update accepted deliveries"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = driver_id);

-- Add triggers for updated_at
CREATE TRIGGER update_driver_vehicles_updated_at
  BEFORE UPDATE ON public.driver_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_verifications_updated_at
  BEFORE UPDATE ON public.driver_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();