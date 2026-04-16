import { createContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/querryclient";
import { fetchUserRole, fetchProfile, fetchDriverVehicle, fetchDriverVerification } from "@/hooks/getuser";
import { promise } from "zod";


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

    const prefetchUserData = async (userId: string) => {
    try {
      // Prefetch EVERYTHING once
      const role = await queryClient.fetchQuery({
        queryKey: ["role", userId],
        queryFn: () => fetchUserRole(userId),
      });
      console.log('user role', role)

      setRole(role);

      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["profile", userId],
          queryFn: () => fetchProfile(userId),
        }),
        queryClient.prefetchQuery({
          queryKey: ["vehicle", userId],
          queryFn: () => fetchDriverVehicle(userId),
        }),
        role === "driver" ?
          queryClient.prefetchQuery({
            queryKey: ["driverVerification", userId],
            queryFn: () => fetchDriverVerification(userId),
          }):Promise.resolve()
      ]);
    } catch (err) {
      console.error("Prefetch error:", err);
    }
  };

  // const fetchRole = async (userId: string) => {
  //   console.log('getting user role:', userId);
  //   setRoleLoading(true);

  //   const { data:userdata, error } = await supabase
  //     .from("user_roles")
  //     .select("role")
  //     .eq("user_id", userId)
  //     .maybeSingle();

  //   if (userdata) {
  //     console.log('userrole:', userdata?.role);
  //     setRole(userdata?.role ?? "user");
  //   } else {
  //     setRole("user");
  //   }

  //   if (error) {
  //     console.log(error.message);
  //   }

  //   setRoleLoading(false);
  // };

  useEffect(() => {
    // Set up listener FIRST to avoid missing events
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
    

        if (session?.user) {
          // Fire-and-forget to avoid blocking the auth state change callback
         prefetchUserData(session.user.id);

        } else {
          setRole(null);
          setLoading(false);
        }

        setLoading(false)
      }
    );
   

    // Then check for existing session
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
       prefetchUserData(session.user.id);
      }

      setLoading(false);
    };

    // supabase.auth.getSession().then(({ data }) => {
    //   const currentSession = data.session;
    //   setSession(currentSession);
    //   setUser(currentSession?.user ?? null);
      

    //   if (currentSession?.user) {
    //     prefetchUserData(session.user.id);
    //   } else {
    //     setRole(null);
    //     setLoading(false);
    //   }
    // });


    init();
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

