import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DollarSign, Package, TrendingUp, LogOut, User, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  // Mock data
  const stats = {
    todayEarnings: 145.50,
    completedTrips: 8,
    rating: 4.8,
  };

  const pendingRequests = [
    { id: 1, customer: "Alice Brown", pickup: "123 Main St", dropoff: "456 Oak Ave", distance: "5.2 mi", price: 25 },
    { id: 2, customer: "Bob Davis", pickup: "789 Elm St", dropoff: "321 Pine Rd", distance: "3.8 mi", price: 18 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/driver/dashboard")}
            className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent cursor-pointer"
          >
            Wehauler Driver
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
                <p className="text-xs text-muted-foreground">+12% from yesterday</p>
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
                <div className="text-2xl font-bold">{stats.rating}</div>
                <p className="text-xs text-muted-foreground">Based on 156 reviews</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Requests */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Pending Delivery Requests</CardTitle>
              <CardDescription>Accept requests to start earning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingRequests.map((request) => (
                <Collapsible key={request.id}>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{request.customer}</span>
                          <Badge variant="secondary">{request.distance}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pickup: {request.pickup}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xl font-bold">${request.price}</div>
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
                            <div><span className="font-medium">Pickup:</span> {request.pickup}</div>
                            <div><span className="font-medium">Dropoff:</span> {request.dropoff}</div>
                            <div><span className="font-medium">Distance:</span> {request.distance}</div>
                            <div><span className="font-medium">Estimated Payment:</span> ${request.price}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                          <Button variant="outline" size="sm">Decline</Button>
                          <Button 
                            variant="hero" 
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Request Accepted",
                                description: "You've accepted the delivery request",
                              });
                            }}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
