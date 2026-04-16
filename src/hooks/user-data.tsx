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

  export const useVerififcation = (userId?: string) =>
  useQuery({
    queryKey: ["driver-verfifction", userId],
    queryFn: () => fetchDriverVerification(userId!),
    enabled: !!userId,
  });