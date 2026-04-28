import { useQuery } from "@tanstack/react-query";
import { fetchUserRole, fetchProfile, fetchDriverVehicle, fetchDriverVerification } from "@/hooks/getuser";

export const useRole = (userId?: string) =>
  useQuery({
    queryKey: ["role", userId],
    queryFn: () => fetchUserRole(userId!),
    enabled: !!userId,
  });

export const useProfile = (userId?: string) =>
  useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

export const useVehicle = (userId?: string) =>
  useQuery({
    queryKey: ["vehicle", userId],
    queryFn: () => fetchDriverVehicle(userId!),
    enabled: !!userId,
  });

  export const useVerififcation = (userId?: string, role?:string) =>
  useQuery({
    queryKey: ["driverVerification", userId],
    queryFn: () => fetchDriverVerification(userId!),
    enabled: !!userId && role === "driver",
    staleTime: 1000 * 60 * 5, // cache 5 mins
  });
