import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/user-auth";
type Role = "user" | "driver";
type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
};

export function PublicRoute({ children }) {
  const { user, role, loading } = useAuth();

  // console.log("PublicRoute:", { user, role, loading });

  if (loading) return null;

  if (user && role) {
    return role === "driver"?<Navigate to="/driver/dashboard" />:<Navigate to="/customer/dashboard" />;
  }

  return children;
}

export default function ProtectedRoute({ children, role: [] }) {
  const { user, role,loading } = useAuth();
  const defaultRedirect = role === "driver" 
  ? "/driver/dashboard" 
  : "/customer/dashboard";

  if (loading) return null;

  if (!user) return <Navigate to="/login" />;
  
  // if (role !== requiredRole) return requiredRole === "driver"?<Navigate to="/driver/dashboard" />:<Navigate to="/customer/dashboard" />;
  if (role && !role.includes(role)) {
  return <Navigate to={defaultRedirect} replace />;
}
  
  return children;
}