import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Package, TrendingUp, LogOut, User, ChevronDown, Filter, BarChart3, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DeliveryMap from "@/components/DeliveryMap";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import logo from "@/assets/logo.png";

interface PendingDelivery {
  id: string;
  customer_id: string;
  driver_id?: string | null;
  pickup_location: string;
  delivery_location: string;
  item_description: string;
  item_type?: string;
  quantity?: number;
  vehicle_type?: string;
  receipt_url?: string;
  price: number;
  estimated_distance: number;
  created_at: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  status: string;
}

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingDelivery[]>([]);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "price" | "time">("time");
  const [filterDistance, setFilterDistance] = useState<"all" | "near" | "far">("all");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
  const { isTracking, location } = useLocationTracking(user?.id, locationTrackingEnabled);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    yesterdayEarnings: 0,
    completedTrips: 0,
    rating: 0,
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
    };
    checkUser();
  }, [navigate]);

  // Request notification permission on mount
  useEffect(() => {
    const initNotifications = async () => {
      const { notificationService } = await import('@/utils/notificationService');
      
      if (notificationService.isSupported()) {
        const hasPermission = await notificationService.requestPermission();
        setNotificationsEnabled(hasPermission);
        
        if (hasPermission) {
          toast({
            title: "Notifications Enabled",
            description: "You'll receive alerts for new delivery requests",
          });
        }
      }
    };

    initNotifications();
  }, [toast]);

  // Fetch driver stats and pending deliveries
  useEffect(() => {
    if (!user) return;

    const fetchDriverData = async () => {
      // Fetch pending deliveries (both unassigned and assigned to this driver)
      const { data: pendingData, error: pendingError } = await supabase
        .from("deliveries")
        .select("*")
        .or(`and(status.eq.pending,driver_id.is.null),and(status.eq.assigned,driver_id.eq.${user.id})`);

      if (pendingError) {
        console.error("Error fetching deliveries:", pendingError);
        toast({
          title: "Error",
          description: "Failed to load pending requests",
          variant: "destructive",
        });
      } else {
        setPendingRequests(pendingData || []);
      }

      // Fetch today's earnings and trips
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: todayDeliveries } = await supabase
        .from("deliveries")
        .select("price, customer_rating")
        .eq("driver_id", user.id)
        .eq("status", "delivered")
        .gte("delivered_at", todayISO);

      // Fetch yesterday's earnings for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = yesterday.toISOString();

      const { data: yesterdayDeliveries } = await supabase
        .from("deliveries")
        .select("price")
        .eq("driver_id", user.id)
        .eq("status", "delivered")
        .gte("delivered_at", yesterdayISO)
        .lt("delivered_at", todayISO);

      // Calculate stats
      const todayEarnings = todayDeliveries?.reduce((sum, d) => sum + (Number(d.price) || 0), 0) || 0;
      const yesterdayEarnings = yesterdayDeliveries?.reduce((sum, d) => sum + (Number(d.price) || 0), 0) || 0;
      const completedTrips = todayDeliveries?.length || 0;

      // Calculate average rating from today's deliveries
      const ratingsToday = todayDeliveries?.filter(d => d.customer_rating) || [];
      const avgRating = ratingsToday.length > 0
        ? ratingsToday.reduce((sum, d) => sum + (d.customer_rating || 0), 0) / ratingsToday.length
        : 0;

      setStats({
        todayEarnings,
        yesterdayEarnings,
        completedTrips,
        rating: Number(avgRating.toFixed(1)),
      });
    };

    fetchDriverData();

    // Set up realtime subscription
    const channel = supabase
      .channel("pending-deliveries")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deliveries",
          filter: "status=eq.pending",
        },
        async (payload) => {
          const newDelivery = payload.new as PendingDelivery;
          if (!newDelivery.driver_id) {
            setPendingRequests((prev) => [...prev, newDelivery]);
            
            // Send notification for new delivery
            if (notificationsEnabled) {
              const { notificationService } = await import('@/utils/notificationService');
              await notificationService.notifyNewDelivery({
                pickup: newDelivery.pickup_location,
                delivery: newDelivery.delivery_location,
                price: newDelivery.price,
                distance: newDelivery.estimated_distance,
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deliveries",
          filter: `driver_id=eq.${user.id}`,
        },
        async (payload) => {
          const assignedDelivery = payload.new as PendingDelivery;
          setPendingRequests((prev) => [...prev, assignedDelivery]);
          
          // Send notification for assigned delivery
          if (notificationsEnabled) {
            const { notificationService } = await import('@/utils/notificationService');
            await notificationService.showNotification('New Delivery Assigned!', {
              body: `${assignedDelivery.pickup_location} → ${assignedDelivery.delivery_location}\n$${assignedDelivery.price.toFixed(2)} • ${assignedDelivery.estimated_distance.toFixed(1)} mi`,
              tag: 'assigned-delivery',
              requireInteraction: true,
            });
          }
          
          toast({
            title: "New Delivery Assigned!",
            description: `$${assignedDelivery.price.toFixed(2)} - ${assignedDelivery.pickup_location}`,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
        },
        (payload) => {
          const updatedDelivery = payload.new as PendingDelivery;
          // Remove from list if no longer pending/assigned or if assigned to another driver
          if (updatedDelivery.status !== "pending" && updatedDelivery.status !== "assigned") {
            setPendingRequests((prev) =>
              prev.filter((req) => req.id !== updatedDelivery.id)
            );
          } else if (updatedDelivery.driver_id && updatedDelivery.driver_id !== user.id) {
            setPendingRequests((prev) =>
              prev.filter((req) => req.id !== updatedDelivery.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, notificationsEnabled]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  const handleDecline = async () => {
    if (!selectedRequestId) return;

    const { error } = await supabase
      .from("deliveries")
      .update({ status: "declined" })
      .eq("id", selectedRequestId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to decline request",
        variant: "destructive",
      });
      return;
    }

    setPendingRequests((prev) => prev.filter((req) => req.id !== selectedRequestId));
    toast({
      title: "Request Declined",
      description: "The delivery request has been declined",
    });
    setDeclineDialogOpen(false);
    setSelectedRequestId(null);
  };

  const handleAccept = async (requestId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("deliveries")
      .update({ 
        driver_id: user.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
      return;
    }

    setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
    toast({
      title: "Request Accepted",
      description: "You've accepted the delivery request",
    });
  };

  // Filter and sort logic
  const filteredAndSortedRequests = pendingRequests
    .filter((req) => {
      if (filterDistance === "all") return true;
      if (filterDistance === "near") return req.estimated_distance <= 5;
      if (filterDistance === "far") return req.estimated_distance > 5;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "distance") return a.estimated_distance - b.estimated_distance;
      if (sortBy === "price") return b.price - a.price;
      if (sortBy === "time") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  // Calculate percentage change
  const earningsChange = stats.yesterdayEarnings > 0
    ? ((stats.todayEarnings - stats.yesterdayEarnings) / stats.yesterdayEarnings * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/driver/dashboard")}
              className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent cursor-pointer"
            >
               <img
                src={logo}
                alt="Wehauler Logo"
                className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain"
              />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${isTracking ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-muted-foreground hidden sm:inline">
                {isTracking ? 'Location Active' : 'Location Off'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/driver/earnings")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Earnings
            </Button>
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
          <div>
            <h1 className="text-3xl font-bold mb-2">Driver Dashboard</h1>
            <p className="text-muted-foreground">Manage your deliveries and earnings</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.todayEarnings.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {Number(earningsChange) >= 0 ? '+' : ''}{earningsChange}% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Trips</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedTrips}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rating</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rating || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">Average rating today</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Requests */}
          <Card className="shadow-medium">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Delivery Requests</CardTitle>
                  <CardDescription>Accept requests to start earning</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterDistance} onValueChange={(value: any) => setFilterDistance(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Distance</SelectItem>
                      <SelectItem value="near">Near (&lt;5mi)</SelectItem>
                      <SelectItem value="far">Far (&gt;5mi)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Newest</SelectItem>
                      <SelectItem value="distance">Distance</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredAndSortedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending requests available
                </div>
              ) : (
                filteredAndSortedRequests.map((request) => (
                  <Collapsible key={request.id}>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{request.item_description}</span>
                            <Badge variant="secondary">{request.estimated_distance.toFixed(1)} mi</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Pickup: {request.pickup_location}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-bold">${request.price.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">Estimated</div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1">
                              View More
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      
                      <CollapsibleContent className="pt-4">
                        <div className="space-y-3 border-t pt-3">
                          <div className="text-sm">
                            <div className="font-medium mb-1">Full Details</div>
                            <div className="space-y-1 text-muted-foreground">
                              <div><span className="font-medium">Item:</span> {request.item_description}</div>
                              {request.item_type && <div><span className="font-medium">Type:</span> {request.item_type}</div>}
                              {request.quantity && <div><span className="font-medium">Quantity:</span> {request.quantity}</div>}
                              {request.vehicle_type && <div><span className="font-medium">Vehicle Required:</span> {request.vehicle_type}</div>}
                              <div><span className="font-medium">Pickup:</span> {request.pickup_location}</div>
                              <div><span className="font-medium">Dropoff:</span> {request.delivery_location}</div>
                              <div><span className="font-medium">Distance:</span> {request.estimated_distance.toFixed(1)} mi</div>
                              <div><span className="font-medium">Estimated Payment:</span> ${request.price.toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Order Receipt */}
                          {request.receipt_url && (
                            <div className="mt-4">
                              <div className="font-medium text-sm mb-2">Order Receipt</div>
                              <img 
                                src={request.receipt_url} 
                                alt="Order receipt" 
                                className="w-full max-w-md rounded-lg border shadow-sm"
                              />
                            </div>
                          )}
                          
                          {/* Map View */}
                          <div className="mt-4">
                            <DeliveryMap
                              pickupLat={request.pickup_lat}
                              pickupLng={request.pickup_lng}
                              deliveryLat={request.delivery_lat}
                              deliveryLng={request.delivery_lng}
                              pickupAddress={request.pickup_location}
                              deliveryAddress={request.delivery_location}
                            />
                          </div>
                          
                          <div className="flex gap-2 justify-end pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRequestId(request.id);
                                setDeclineDialogOpen(true);
                              }}
                            >
                              Decline
                            </Button>
                            <Button 
                              variant="hero" 
                              size="sm"
                              onClick={() => handleAccept(request.id)}
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Delivery Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this delivery request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRequestId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline}>
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverDashboard;
