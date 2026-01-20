import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, MapPin, Clock, LogOut, User, CheckCircle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      setProfile(profileData);

      // Fetch delivery statistics from recent bookings with driver info
      const { data: bookingsData } = await supabase
        .from("deliveries")
        .select(`
          *,
          driver:driver_id(first_name, last_name, phone, avatar_url, gender, driver_vehicles( vehicle_type, make, model, year, license_plate)) `)
        .eq("customer_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (bookingsData) {
        
        const totalBookings = bookingsData.length;
        const activeBookings = bookingsData.filter(
          (d) => d.status !== "delivered" && d.status !== "cancelled"
        ).length;
        const totalSpent = bookingsData.reduce(
          (sum, d) => sum + (Number(d.price) || 0),
          0
        );

        setStats({
          totalBookings,
          activeBookings,
          totalSpent,
        });
        setRecentBookings(bookingsData);

      }

      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/customer/dashboard")}
            className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent cursor-pointer"
          >
             <img
              src={logo}
              alt="Wehauler Logo"
              className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain"
            />
          </button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Section */}
          <Card className="shadow-medium">
            <CardContent className="p-6 ">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"> 
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-2 align-content-center">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Welcome back, {profile?.first_name || 'Customer'}!
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified Customer
                        </Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Manage your deliveries and bookings
                    </p>
                  </div>
                </div>

                <Button variant="hero" onClick={() => navigate("/customer/booking")}>
                  Book New Delivery
                </Button>
              </div>
            </CardContent>
          </Card>


          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeBookings}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All deliveries</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bookings */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your latest delivery bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings yet. Book your first delivery!
                </div>
              ) : (
                recentBookings.map((booking) => {
                  console.log('recipt url ', booking.receipt_url);
                  const isAssignedToDriver = booking.driver_id !== null;
                  const hasFullDetails = isAssignedToDriver;
                    return (
                      <Collapsible key={booking.id}>
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg" onClick={() => { if (booking.status === "accepted"|| booking.status === "in_transit" && booking.driver_id !==null) { navigate(`/order-tracking?id=${booking.id}`); }}}>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"> 
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={booking.driver.avatar_url} />
                              <AvatarFallback>
                                {booking.driver.first_name?.[0]}{booking.driver.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  Driver: {booking.driver ? `${booking.driver.first_name} ${booking.driver.last_name}` : "Not assigned"}
                                </span>
                                <Badge variant={booking.status === "delivered" ? "default" : "secondary"}>
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="flex flex-row gap-x-2"> 
                                <div >
                                  <span className="font-semibold">
                                    Phone Number: {booking.driver.phone}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="font-semibold">
                                    Vehicle: {booking.driver.driver_vehicles.vehicle_type}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold">
                                    Model: {booking.driver.driver_vehicles.model}
                                  </span>
                                </div>

                                 <div>
                                  <span className="font-semibold">
                                    Year: {booking.driver.driver_vehicles.year}
                                  </span>
                                </div>

                                 <div>
                                  <span className="font-semibold">
                                    License Plate: {booking.driver.driver_vehicles.license_plate}
                                  </span>
                                </div>

                              </div>
                              <div className="text-sm text-muted-foreground">
                               

                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {booking.pickup_location} → {booking.delivery_location}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(booking.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">
                              ${booking.price ? Number(booking.price).toFixed(2) : "0.00"}
                            </div>

                            <CollapsibleTrigger asChild>  
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                View Details
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="space-y-3 border-t pt-3">
                                <div className="text-sm">
                                  <div className="font-medium mb-1">
                                    {hasFullDetails ? "Full Details" : "Delivery Preview"}
                                  </div>
                                  <div className="space-y-1 text-muted-foreground">
                                  
                                    {booking.item_type && <div><span className="font-medium">Type:</span> {booking.item_type}</div>}
                                    {booking.quantity && <div><span className="font-medium">Quantity:</span> {booking.quantity}</div>}
                                    {booking.vehicle_type && <div><span className="font-medium">Vehicle Required:</span> {booking.vehicle_type}</div>}
                                    <div><span className="font-medium">Distance:</span> {booking.estimated_distance.toFixed(1)} mi</div>
                                    <div><span className="font-medium">Estimated Payment:</span> ${booking.price ? Number(booking.price).toFixed(2) : "0.00"}</div>
                                  </div>
                                </div>
    
                                {/* Order Receipt - only for assigned deliveries */}
                                {hasFullDetails && booking.receipt_url && (
                                  <div className="mt-4">
                                    <div className="font-medium text-sm mb-2">Order Receipt</div>
                                    <img 
                                      src={booking.receipt_url} 
                                      alt="Order receipt" 
                                      className="w-full max-w-md rounded-lg border shadow-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </div>
                      </Collapsible>
                    );
                  }
                )
              )
            }
          </CardContent>
        </Card>
      </div>
    </main>
    </div>
  );
};

export default CustomerDashboard;
