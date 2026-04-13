import { createContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "user" | "driver" | null;

type AuthContextType = {
  user: any | null;
  session: any | null;
  role: Role;
  loading: boolean;
};



export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const loading = authLoading || roleLoading;

  // fetch role
  // const fetchRole = async (userId: string) => {
  //   const { data:userData, error } = await supabase
  //     .from("user_roles")
  //     .select("role")
  //     .eq("user_id", userId)
  //     .single();
  //   if (userData) {
  //     console.log('user data from auth provider:',userData?.role )
  //     setRole(userData?.role ?? "user");
  //   } else {
  //     setRole("user"); // fallback
  //   }
  // };
  const fetchRole = async (userId: string) => {
    console.log('getting user role:', userId);
    setRoleLoading(true);

    const { data:userdata, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (userdata) {
      console.log('userrole:', userdata?.role);
      setRole(userdata?.role ?? "user");
    } else {
      setRole("user");
    }

    if (error) {
      console.log(error.message);
    }

    setRoleLoading(false);
  };

  useEffect(() => {
    // Set up listener FIRST to avoid missing events
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (session?.user) {
          // Fire-and-forget to avoid blocking the auth state change callback
          setTimeout(() => {
            fetchRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setRoleLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAuthLoading(false);

      if (currentSession?.user) {
        fetchRole(currentSession.user.id);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
});