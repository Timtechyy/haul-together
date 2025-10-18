import { useState, useEffect } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  Package, 
  Clock, 
  Star, 
  Plus, 
  Search,
  Bell,
  Menu,
  Truck,
  Calendar,
  DollarSign,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const [activeTab, setActiveTab] = useState<"book" | "deliveries" | "earnings">("book");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  const recentDeliveries = [
    {
      id: "1",
      item: "IKEA Sofa Set",
      from: "IKEA Store",
      to: "123 Main St",
      status: "completed",
      driver: "Mike Johnson",
      driverAvatar: null,
      rating: 5,
      price: "$45",
      date: "2 hours ago"
    },
    {
      id: "2", 
      item: "Washer & Dryer",
      from: "Home Depot",
      to: "456 Oak Ave",
      status: "in-progress",
      driver: "Sarah Chen",
      driverAvatar: null,
      price: "$80",
      estimatedTime: "30 mins"
    }
  ];

  const nearbyDrivers = [
    {
      id: "1",
      name: "Alex Rivera",
      rating: 4.9,
      vehicle: "Pickup Truck",
      distance: "0.5 miles away",
      avatar: null
    },
    {
      id: "2",
      name: "Jordan Kim", 
      rating: 4.8,
      vehicle: "Cargo Van",
      distance: "1.2 miles away", 
      avatar: null
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Wehauler
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome back, John!</h1>
          <p className="text-muted-foreground">Ready for your next delivery?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => setActiveTab("book")}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white mx-auto">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Book Delivery</h3>
                <p className="text-sm text-muted-foreground">Get items delivered</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => setActiveTab("deliveries")}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 bg-gradient-secondary rounded-lg flex items-center justify-center text-white mx-auto">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">My Deliveries</h3>
                <p className="text-sm text-muted-foreground">Track your orders</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => setActiveTab("earnings")}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 bg-gradient-hero rounded-lg flex items-center justify-center text-white mx-auto">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Drive & Earn</h3>
                <p className="text-sm text-muted-foreground">Start delivering</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Content Based on Active Tab */}
        {activeTab === "book" && (
          <div className="space-y-6">
            {/* Quick Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Book a Delivery
                </CardTitle>
                <CardDescription>
                  Get your items delivered quickly and safely
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="pickup" placeholder="Enter pickup address" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery">Delivery Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="delivery" placeholder="Enter delivery address" className="pl-10" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="items">What are you delivering?</Label>
                  <Input id="items" placeholder="e.g., IKEA furniture, appliances, boxes" />
                </div>

                <Button variant="hero" className="w-full">
                  Find Available Drivers
                </Button>
              </CardContent>
            </Card>

            {/* Nearby Drivers */}
            <Card>
              <CardHeader>
                <CardTitle>Available Drivers Nearby</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {nearbyDrivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{driver.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-muted-foreground">{driver.vehicle}</div>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{driver.rating}</span>
                          <span className="text-muted-foreground">• {driver.distance}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Request
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "deliveries" && (
          <div className="space-y-6">
            {/* Recent Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{delivery.item}</h3>
                        <p className="text-sm text-muted-foreground">
                          {delivery.from} → {delivery.to}
                        </p>
                      </div>
                      <Badge variant={delivery.status === "completed" ? "default" : "secondary"}>
                        {delivery.status === "completed" ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{delivery.driver.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{delivery.driver}</span>
                        {delivery.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{delivery.rating}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{delivery.price}</div>
                        <div className="text-sm text-muted-foreground">
                          {delivery.date || delivery.estimatedTime}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-6">
            {/* Driver Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Driver Dashboard
                </CardTitle>
                <CardDescription>
                  Start earning by delivering items in your area
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">$125</div>
                    <div className="text-sm text-muted-foreground">Today's Earnings</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">8</div>
                    <div className="text-sm text-muted-foreground">Deliveries Completed</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-accent">4.9★</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="hero" className="flex-1">
                    Go Online
                  </Button>
                  <Button variant="outline" className="flex-1">
                    View Earnings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;