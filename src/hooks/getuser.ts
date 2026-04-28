import { supabase } from "@/integrations/supabase/client";

export const fetchUserRole = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data?.role ?? "user";
};

export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, avatar_url, gender, created_at, stripe_connect_id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  // console.log('fetching user profile data', data);
  return data;
};

export const fetchDriverVehicle = async (userId: string) => {
  const { data, error } = await supabase
    .from("driver_vehicles")
    .select("vehicle_type, make, model, year, license_plate, insurance_number, tracking_consent")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  // console.log('fetching driver vehicle data', data);
  return data;
};

// hooks/getuser.ts

export const fetchDriverVerification = async (userId: string) => {
  const { data, error } = await supabase
    .from("driver_verifications")
    .select("verification_status, veriff_session_id")
    .eq("user_id", userId)
    .maybeSingle(); // safer than single()

  if (error) throw error;
//  console.log('fetching driver verififcation data', data);
  return data; // can be null
};