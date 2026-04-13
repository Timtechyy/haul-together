import { useContext } from "react";
import { AuthContext } from "src/hooks/auth-context.tsx";

export const useAuth = () => useContext(AuthContext);