import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/user-auth";

export function PublicRoute({ children }) {
  const { user, role, loading } = useAuth();

  console.log("PublicRoute:", { user, role, loading });

  if (loading) return null;

  if (user && role) {
    return role === "driver"?<Navigate to="/driver/dashboard" />:<Navigate to="/customer/dashboard" />;
  }

  return children;
}

export default function ProtectedRoute({ children, role: requiredRole }) {
  const { user, role,loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" />;
  
  if (role !== requiredRole) return requiredRole === "driver"?<Navigate to="/driver/dashboard" />:<Navigate to="/customer/dashboard" />;
  
  return children;
}