import { useEffect, useState } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, EyeOff, Package, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logo from "@/assets/logo.png";
import PhoneInputField from "@/components/ui/phoneinput"
import LicensePlate from "@/components/LicensePlate";
import { useDebounce } from "@/hooks/debouncer";
const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    email: z.string().trim().email("Invalid email address"),
    phone: z.string().trim().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),

    userType: z.enum(["customer", "driver"]),
    gender: z
    .enum(["", "male", "female"])
    .optional()
    .transform((v) => (v ==='' ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    if (data.userType === "driver" && !data.gender) {
      ctx.addIssue({
        path: ["gender"],
        message: "Gender is required for drivers",
        code: z.ZodIssueCode.custom,
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Passwords don't match",
        code: z.ZodIssueCode.custom,
      });
    }
  });

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<"customer" | "driver">("customer");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    gender: "" as "male" | "female",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPlateWidget, setShowPlateWidget] = useState(false);
  const [driverUserId, setDriverUserId] = useState<string | null>(null);
  const [driverName, setDriverName]=useState({
    firstName: "",
    lastName: "",
  });
  const debouncedPhone = useDebounce(formData.phone, 600);
  const [phoneStatus, setPhoneStatus] = useState<
  "idle" | "checking" | "available" | "taken" | "error"
>("idle");

  const canSubmit = phoneStatus === "available";

  useEffect(()=>{
    if (!debouncedPhone || debouncedPhone.length < 10) {
      setPhoneStatus("idle");
      return;
    }

    let cancelled = false;


    const checkPhone = async () => {
    setPhoneStatus("checking");

    const { data, error } = await supabase
      .from("profiles") // or users table
      .select("id")
      .eq("phone", debouncedPhone)
      .limit(1)
      .maybeSingle();

    if (cancelled) return;

    if (error) {
      setPhoneStatus("error");
      return;
    }

    if (data) {
      setPhoneStatus("taken");
    } else {
      setPhoneStatus("available");
    }
  };

  checkPhone();
  }, [debouncedPhone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = signupSchema.safeParse({...formData, userType, gender: formData.gender || undefined,});
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const role = userType === "driver" ? "driver" : "user";
      
      // Get driver's location if they're signing up as a driver
      let driverLocation: { lat: number; lng: number } | null = null;
      if (userType === "driver") {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          driverLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch (geoError) {
          console.error("Location error:", geoError);
          toast({
            title: "Location Required",
            description: "Please enable location access for driver signup",
            variant: "destructive",
          });
          return;
        }
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            role: role,
            gender: formData.gender || null,
            driver_lat: driverLocation?.lat,
            driver_lng: driverLocation?.lng,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Success!",
          description: "Account created successfully. Redirecting...",
        });

        // Redirect based on role
        if (userType === 'driver') {
          const { data: profileData, error } = await supabase.from("profiles").select("first_name, last_name").eq("id", data.user.id).single();
          setDriverName({firstName:profileData.first_name, lastName:profileData.last_name});
          setDriverUserId(data.user.id);
          setShowPlateWidget(true);
        } else {
          navigate("/customer/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Back to home */}
        <Button variant="ghost" size="sm" asChild className="group">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </Button>

        {showPlateWidget ? (
         <Card className="shadow-medium"> 
          <CardHeader className="space-y-1 text-center items-center">
            <div className="flex flex-col justify-start items-start h-full">
              <img
                src={logo}
                alt="Wehauler Logo"
                className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain"
              />
            </div>
          
            <CardTitle className="text-2xl">Welcome {driverName.firstName} {driverName.lastName}</CardTitle>
            <CardDescription>
              To Proceed please Enter Your Vehicle Plate Number
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LicensePlate
              userId={driverUserId}
              onComplete={() => navigate("/driver/dashboard")}
            />
          </CardContent>
          </Card>
        ) : (
          <>
          {/* Signup Form */}
        <Card className="shadow-medium">
          <CardHeader className="space-y-1 text-center items-center">
           <div className="flex flex-col justify-start items-start h-full">
              <img
                src={logo}
                alt="Wehauler Logo"
                className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain"
              />
            </div>
          
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Join our community of customers and drivers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Type Selection */}
            <Tabs value={userType} onValueChange={(value) => setUserType(value as "customer" | "driver")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="driver" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Driver
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="customer" className="mt-4">
                <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-lg">
                  Get items delivered from stores and private sellers
                </div>
              </TabsContent>
              
              <TabsContent value="driver" className="mt-4">
                <div className="text-sm text-muted-foreground text-center p-3 bg-muted/50 rounded-lg">
                  Earn money delivering items with your vehicle
                </div>
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  // type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>

                <PhoneInputField
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(value) =>
                    setFormData({ ...formData, phone: value })
                  }
                  required
                />

                {phoneStatus === "checking" && (
                  <p className="text-sm text-muted-foreground">
                    Checking phone number…
                  </p>
                )}

                {phoneStatus === "taken" && (
                  <p className="text-sm text-red-500">
                    This phone number is already registered
                  </p>
                )}

                {phoneStatus === "available" && (
                  <p className="text-sm text-green-600">
                    Phone number is available
                  </p>
                )}
              </div>

              {userType === "driver" && (
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "male" | "female" })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    className="bg-transparent"
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm" 
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
                
              <Button type="submit" variant="hero" className="w-full" disabled={isLoading && !canSubmit}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <Separator />

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button variant="link" size="sm" asChild className="px-0">
                  <Link to="/login">Sign in</Link>
                </Button>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Terms Notice */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
        </>
        )}

      </div>
    </div>
  );
};

export default Signup;