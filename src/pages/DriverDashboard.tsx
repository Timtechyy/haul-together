import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Package, TrendingUp, LogOut, User, ChevronDown, Filter, BarChart3, MapPin, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import logo from "@/assets/logo.png";
import { ReceiptImage } from "@/components/ReceiptImage";
import { useLocationTrackingContext } from "@/components/locationtracking";
import { formatTime } from "@/components/time";

// Preview interface for unassigned deliveries (limited data for privacy)
interface DeliveryPreview {
  id: string;
  item_description: string;
  item_type?: string;
  quantity?: number;
  vehicle_type?: string;
  price: number;
  estimated_distance: number;
  created_at: string;
  status: string;
  // These will be null/undefined for unassigned deliveries
  driver_id?: string | null;
  pickup_location?: string;
  delivery_location?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  receipt_url?: string;
  customer_id?: string;
}

// Full delivery interface for assigned deliveries
interface AssignedDelivery extends DeliveryPreview {
  pickup_location: string;
  delivery_location: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  receipt_url?: string;
  customer_id: string;
}

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<DeliveryPreview[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliveryPreview[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "price" | "time">("time");
  const [filterDistance, setFilterDistance] = useState<"all" | "near" | "far">("all");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [tabType, setTabType] = useState<"pending" | "completed">("pending");
  const { isTracking } = useLocationTrackingContext();
  // console.log("Location tracking status:", isTracking);
  // console.log("Current user ID:", user?.id);
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
  
  useEffect(() => {
  if (!user) return;

  const fetchDriverData = async () => {
    // Fetch unassigned pending deliveries
    const { data: unassignedData, error: unassignedError } = await supabase
      .from("deliveries")
      .select("id, item_description, item_type, quantity, vehicle_type, price, estimated_distance, created_at, receipt_url, status")
      .eq("status", "pending")
      .is("driver_id", null);

    // Fetch deliveries assigned to this driver
    const { data: assignedData, error: assignedError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("driver_id", user.id)
      .in("status", ["accepted","picking_up", "in_transit"]);

    const{ data: completedDeliveries, error: completedError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("driver_id", user.id)
      .eq("status", "delivered");
      setCompletedDeliveries(completedDeliveries);
      if(completedError){ console.error("Error fetching completed deliveries:", completedError); }

    if (unassignedError || assignedError) {
      console.error("Error fetching deliveries:", unassignedError || assignedError);
      toast({
        title: "Error",
        description: "Failed to load pending requests",
        variant: "destructive",
      });
    } else {
      const allDeliveries: DeliveryPreview[] = [
        ...(unassignedData || []),
        ...(assignedData || []),
      ];
      setPendingRequests(allDeliveries);
      // console.log("Initial deliveries loaded:", allDeliveries.length);
    }

    // Fetch stats (your existing code)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: todayDeliveries } = await supabase
      .from("deliveries")
      .select("price, customer_rating")
      .eq("driver_id", user.id)
      .eq("status", "delivered")
      .gte("delivered_at", todayISO);

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

    const todayEarnings = todayDeliveries?.reduce((sum, d) => sum + (Number(d.price) || 0), 0) || 0;
    const yesterdayEarnings = yesterdayDeliveries?.reduce((sum, d) => sum + (Number(d.price) || 0), 0) || 0;
    const completedTrips = todayDeliveries?.length || 0;

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

  const isDriververified = async () => {
    const { data, error } = await supabase.from("driver_verifications").select("verification_status").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("Error checking verification status:", error);
    } else {
      setIsVerified(data?.verification_status === "approved");
    }
  };

  isDriververified();

  // Set up realtime subscription
  const channel = supabase
    .channel(`driver-deliveries-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "deliveries",
      },
      async (payload) => {
        // console.log("NEW DELIVERY INSERTED:", payload.new);
        
        const newDelivery = payload.new as DeliveryPreview;
        
        // Check if this delivery is relevant to the driver
        const isPending = newDelivery.status === "pending" && !newDelivery.driver_id;
        const isAssignedToMe = newDelivery.driver_id === user.id;
        
        // console.log("Is pending?", isPending, "Is assigned to me?", isAssignedToMe);
        
        if (!isPending && !isAssignedToMe) {
          // console.log("Delivery not relevant, skipping");
          return;
        }

        // Add to list if not already present
        setPendingRequests((prev) => {
          if (prev.some((p) => p.id === newDelivery.id)) {
            // console.log(" Delivery already in list");
            return prev;
          }
          // console.log("Adding new delivery to list");
          return [newDelivery, ...prev];
        });

        // Send notification if assigned to this driver
        if (isAssignedToMe && notificationsEnabled) {
          const assignedDelivery = newDelivery as AssignedDelivery;
          const { notificationService } = await import('@/utils/notificationService');
          await notificationService.showNotification('New Delivery Assigned!', {
            body: `${assignedDelivery.pickup_location} → ${assignedDelivery.delivery_location}\n$${assignedDelivery.price.toFixed(2)} • ${assignedDelivery.estimated_distance.toFixed(1)} mi`,
            tag: 'assigned-delivery',
            requireInteraction: true,
          });
          
          toast({
            title: "New Delivery Assigned!",
            description: `$${assignedDelivery.price.toFixed(2)} - ${assignedDelivery.pickup_location}`,
          });
        } else if (isPending) {
          toast({
            title: "New Delivery Available!",
            description: `$${newDelivery.price.toFixed(2)} - ${newDelivery.estimated_distance.toFixed(1)} mi`,
          });
        }
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
        // console.log("DELIVERY UPDATED:", payload.new);
        
        const updatedDelivery = payload.new as DeliveryPreview;
        const activeStatuses = ["pending", "assigned", "accepted", "picked_up"];

        setPendingRequests((prev) => {
          // Remove if no longer active
          if (!activeStatuses.includes(updatedDelivery.status)) {
            // console.log("Removing completed/cancelled delivery");
            return prev.filter((p) => p.id !== updatedDelivery.id);
          }

          // Remove if assigned to another driver
          if (updatedDelivery.driver_id && 
              updatedDelivery.driver_id !== user.id && 
              updatedDelivery.status !== "pending") {
            // console.log("Removing delivery assigned to another driver");
            return prev.filter((p) => p.id !== updatedDelivery.id);
          }

          // Update existing or add new
          const existingIndex = prev.findIndex((p) => p.id === updatedDelivery.id);
          if (existingIndex !== -1) {
            // console.log("Updating existing delivery");
            const updated = [...prev];
            updated[existingIndex] = updatedDelivery;
            return updated;
          }

          // Add if it's relevant and not already in the list
          if (updatedDelivery.status === "pending" || updatedDelivery.driver_id === user.id) {
            // console.log("Adding updated delivery to list");
            return [updatedDelivery, ...prev];
          }

          return prev;
        });
      }
    )
    .subscribe((status, err) => {
      // console.log("Subscription status:", status);
      
      if (status === 'SUBSCRIBED') {
        // console.log('Successfully subscribed to delivery updates');
        toast({
          title: "Connected",
          description: "Real-time updates active",
        });
      } else if (status === 'CHANNEL_ERROR') {
        // console.error('Channel error - subscription failed', err);
        toast({
          title: "Connection Error",
          description: "Failed to subscribe to real-time updates",
          variant: "destructive",
        });
      } else if (status === 'TIMED_OUT') {
        console.error('Subscription timed out');
      } else if (status === 'CLOSED') {
        // console.log('🔌 Channel closed');
      }
    });

  return () => {
    // console.log("🧹 Cleaning up subscription");
    supabase.removeChannel(channel);
  };

  



}, [user, toast, notificationsEnabled]);


  // completed deliveries
  useEffect(() => {

    const channel = supabase
      .channel(`driver-completed-deliveries-${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
        },
        (payload) => {
          const updatedDelivery = payload.new as DeliveryPreview;
          if (updatedDelivery.status === "delivered" && updatedDelivery.driver_id === user?.id) {
            setCompletedDeliveries((prev) => {
              if (prev.some((d) => d.id === updatedDelivery.id)) {
                return prev;
              }
              return [updatedDelivery, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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


  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  const handleDecline = async () => {
    if (!user && !selectedRequestId) return;

    const { data, error } = await supabase.rpc("cancel_delivery", {
      p_delivery_id:selectedRequestId,
      p_driver_id:user.id
    });
    if(error) { 
      // console.log("Decline error:", error.message);
      return toast({
        title: "Request Cancellation Failed",
        description: error.message,
      });
    };
    setPendingRequests((prev) => prev.filter((req) => req.id !== selectedRequestId));
    toast({
      title: "Request Declined",
      description: "The delivery request has been declined",
    });
    setDeclineDialogOpen(false);
    setSelectedRequestId(null);
  };

  const handleAccept = async () => {
    if (!user && !selectedRequestId) return;
    const { data, error } = await supabase.rpc("accept_delivery", {
      p_delivery_id:selectedRequestId,
    });

    if(error) {
      // console.log("Accept error:", error.message);
      return toast({ title: "Error", description: error.message, variant: "destructive"});
    
    }
    setPendingRequests((prev) => prev.filter((req) => req.id !== selectedRequestId));
    toast({
      title: "Request Accepted",
      description: "You've accepted the delivery request",
    });
    setSelectedRequestId(null);
  };

  const handleCancel = async () => {
      if (!user && !selectedRequestId) return;

    const { data, error } = await supabase.rpc("cancel_delivery", {
      p_delivery_id:selectedRequestId,
      p_driver_id:user.id
    });
    if(error) { 
      return toast({
        title: "Request Cancellation Failed",
        description: error.message,
      });
    };
    setPendingRequests((prev) => prev.filter((req) => req.id !== selectedRequestId));
    toast({
      title: "Request Cancelled",
      description: "You've cancelled the delivery request",
    });
    setCancelDialogOpen(false);
    setSelectedRequestId(null);
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
                <div className="text-2xl font-bold">{stats.rating || '0'}</div>
                <p className="text-xs text-muted-foreground">Average rating today</p>
              </CardContent>
            </Card>
          </div>
          {
            !isVerified ? (
              <Card>

                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Driver Verification Needed</CardTitle>
                  <CardDescription>
                    You need to complete the driver verification process to accept delivery requests.
                  </CardDescription>
                  <CardContent>
                    <div className="mt-14 justify-center flex">
                      <Button 
                        variant="outline" 
                        size="sm" 
                      
                        onClick={() => navigate("/driver/verification")}
                      >
                        Complete Verification
                      </Button>
                    </div> 
                  </CardContent>

                </CardHeader>
              </Card>
            ):(
                <Tabs value={tabType} onValueChange={(value) => setTabType(value as "pending" | "completed")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Completed
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="mt-4">
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
                        filteredAndSortedRequests.map((request) => {
                          // Check if this is an assigned delivery (has full details) or just a preview
                          const isAssignedToDriver = request.driver_id === user?.id;
                          const hasFullDetails = isAssignedToDriver && request.pickup_location;
                          
                          return (
                            <Collapsible key={request.id}>
                              <div className="p-4 border rounded-lg" onClick={() => { if (request.status === "accepted" || request.status === "picking_up" || request.status === "in_transit" && isAssignedToDriver) { navigate(`/order-tracking?id=${request.id}`); }}}>
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{request.item_description}</span>
                                      <Badge variant="secondary">{request.estimated_distance.toFixed(1)} mi</Badge>
                                      {isAssignedToDriver && (
                                        <Badge variant="default" className="bg-green-500">Assigned to you</Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {hasFullDetails 
                                        ? `Pickup: ${request.pickup_location}`
                                        : "Accept to view full pickup details"
                                      }
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="text-xl font-bold">${request.price.toFixed(2)}</div>
                                      <div className="text-xs text-muted-foreground">Estimated</div>
                                    </div>
                                    <CollapsibleTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="gap-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        >
                                        View More
                                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                      </Button>
                                    </CollapsibleTrigger>
                                  </div>
                                </div>
                                
                                <CollapsibleContent className="pt-4">
                                  <div className="space-y-4 pt-3 ">
                                    <div className="text-sm">
                                      <div className="font-medium mb-1">
                                        {hasFullDetails ? "Full Details" : "Delivery Preview"}
                                      </div>
                                      <div className="space-y-1 text-muted-foreground">
                                        {request.item_type && <div><span className="font-medium">Type:</span> {request.item_type}</div>}
                                        {request.quantity && <div><span className="font-medium">Quantity:</span> {request.quantity}</div>}
                                        {request.vehicle_type && <div><span className="font-medium">Vehicle Required:</span> {request.vehicle_type}</div>}
                                        <div><span className="font-medium">Distance:</span> {request.estimated_distance.toFixed(1)} mi</div>
                                        <div><span className="font-medium">Estimated Payment:</span> ${request.price.toFixed(2)}</div>
                                        
                                        {/* Only show addresses for assigned deliveries */}
                                      
                                        <div>
                                          <span className="font-medium">Pickup:</span> {request.pickup_location}
                                        </div>
                                        <div>
                                          <span className="font-medium">Dropoff:</span> {request.delivery_location}
                                        </div>
                                        <div className="mt-2 p-3 bg-muted rounded-lg text-center">
                                          <span className="text-muted-foreground">
                                            Accept this delivery to view pickup and dropoff locations
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Order Receipt - only for assigned deliveries */}
                                    {request.receipt_url && (
                                      <div className="mt-4">
                                        <div className="font-medium text-sm mb-2">Order Receipt</div>
                                        <ReceiptImage receiptUrl={request.receipt_url} />
                                      </div>
                                    )}
                                    <div className="flex gap-2 justify-end pt-2">
                                      {isAssignedToDriver ? (
                                        <Button
                                          variant="outline" 
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRequestId(request.id);
                                            setCancelDialogOpen(true);
                                          }}
                                        >
                                          Cancel Assignment
                                        </Button>
                                      ) : (
                                        <>
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
                                            onClick={() => {
                                              setSelectedRequestId(request.id);
                                              handleAccept();
                                            }}
                                          >
                                            Accept
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="completed" className="mt-4">
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle>Completed Deliveries</CardTitle>
                      <CardDescription>Recently completed deliveries</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {completedDeliveries.map((delivery) => (
                        <Collapsible key={delivery.id}>
                          <CollapsibleTrigger asChild>
                            <div key={delivery.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="font-semibold">{delivery.item_description}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Delivered to: {delivery.delivery_location}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatTime(delivery.created_at)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold">${delivery.price.toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">Completed</div>
                                </div>
                              </div>
                              <CollapsibleContent className="pt-4">
                                <div className="space-y-4 pt-3 ">
                                  <div className="text-sm">
                                    <div className="font-medium mb-1">
                                      Full Details
                                    </div>
                                    <div className="space-y-1 text-muted-foreground">
                                      {delivery.item_type && <div>
                                        <span className="font-medium">Type:</span> {delivery.item_type}
                                      </div>}
                                      {delivery.quantity && <div><span className="font-medium">Quantity:</span> {delivery.quantity}</div>}
                                      {delivery.vehicle_type && <div><span className="font-medium">Vehicle Required:</span> {delivery.vehicle_type}</div>}
                                      <div><span className="font-medium">Distance:</span> {delivery.estimated_distance.toFixed(1)} mi</div>
                                      <div><span className="font-medium">Estimated Payment:</span> ${delivery.price.toFixed(2)}</div>
                                      
                                      {/* Only show addresses for assigned deliveries */}
                                    
                                      <div>
                                        <span className="font-medium">Pickup:</span> {delivery.pickup_location}
                                      </div>
                                      <div>
                                        <span className="font-medium">Dropoff:</span> {delivery.delivery_location}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Order Receipt - only for assigned deliveries */}
                                  {delivery.receipt_url && (
                                    <div className="mt-4">
                                      <div className="font-medium text-sm mb-2">Order Receipt</div>
                                      <ReceiptImage receiptUrl={delivery.receipt_url} />
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </CollapsibleTrigger>
                        </Collapsible>
                      ))}
                      {completedDeliveries.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No completed deliveries yet.
                        </div>
                      )}
                    </CardContent>                    
                  </Card>
                </TabsContent>
            </Tabs>
            )
          }
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
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Delivery Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this delivery assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRequestId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Cancel Delivery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverDashboard;
