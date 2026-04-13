import { createContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "user" | "driver" | null;

type AuthContextType = {
  user: any | null;
  session: any | null;
  role: Role;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 fetch role
  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!error) {
      setRole(data?.role ?? "user");
    } else {
      setRole("user"); // fallback
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchRole(currentSession.user.id);
      }

      setLoading(false);
    };

    initializeAuth();

    // 🔹 listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRole(session.user.id);
        } else {
          setRole(null);
        }

        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};