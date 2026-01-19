import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Package, CheckCircle, Car } from "lucide-react";
import DeliveryMap from "@/components/DeliveryMap";

const OrderTracking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const isDriver = userRole === "driver"

  useEffect(() => {
    const fetchDelivery = async () => {

      const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        } 
      setUserId(user.id);

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      setUserRole(roleData.role);

      if (!orderId) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load delivery details",
          variant: "destructive",
        });
        navigate("/");
        return;
      }  
      
      const isCustomer = data.customer_id === user.id;
      const isDriver = data.driver_id === user.id;

      if (!isCustomer && !isDriver) {
        navigate("/unauthorized");
        return;
      }

      // // Optional: Only allow accepted orders
      // if (data.status !== "accepted") {
      //   navigate("/dashboard");
      //   return;
      // }

      setDelivery(data);
      
      // Fetch driver profile if assigned
      if (data.driver_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.driver_id)
          .single();
        
        setDriverProfile(profile);
      }
      
      setLoading(false);
    };

    fetchDelivery();
  
    // Set up realtime subscription for delivery updates
    const channel = supabase
      .channel(`delivery-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          setDelivery(updated);

          // Fetch driver profile when assigned
          if (updated.driver_id && !driverProfile) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', updated.driver_id)
              .single();
            
            setDriverProfile(profile);

            toast({
              title: "Driver Assigned!",
              description: `${profile?.first_name} ${profile?.last_name} accepted your delivery`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate, toast]);

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from('deliveries')
      .update({ 
        status: newStatus,
        ...(newStatus === 'picking_up' && { picked_up_at: new Date().toISOString() }),
        ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() }),
      })
      .eq('id', orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
      return;
    }

    setDelivery({ ...delivery, status: newStatus });
    toast({
      title: "Status Updated",
      description: `Delivery status updated to ${newStatus.replace('_', ' ')}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: "secondary",
      accepted: "default",
      picking_up: "default",
      in_transit: "default",
      delivered: "success",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => {
              if (isDriver) {
                navigate("/driver/dashboard")
              }else {
                navigate("/customer/dashboard")
              }
            }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Delivery Tracking
                </CardTitle>
                {getStatusBadge(delivery.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Waiting for Driver */}
              {delivery.status === 'pending' && (
                <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
                  <div className="animate-pulse">
                    <Package className="h-12 w-12 mx-auto text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Waiting for Driver</h3>
                    <p className="text-sm text-muted-foreground">
                      We're notifying available drivers. Someone will accept your delivery soon!
                    </p>
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {delivery.driver_id && driverProfile && !isDriver && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">
                        {driverProfile.first_name} {driverProfile.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">Your assigned driver</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Route Information */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Pickup Location</p>
                    <p className="text-muted-foreground">{delivery.pickup_location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-secondary mt-1" />
                  <div>
                    <p className="font-semibold">Delivery Location</p>
                    <p className="text-muted-foreground">{delivery.delivery_location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Package className="h-5 w-5 text-accent mt-1" />
                  <div>
                    <p className="font-semibold">Item Description</p>
                    <p className="text-muted-foreground">{delivery.item_description}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Car className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Vehicle Type</p>
                    <p className="text-muted-foreground">{delivery.vehicle_type}</p>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-3">
                <h3 className="font-semibold">Delivery Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${delivery.status !== 'accepted' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={delivery.status !== 'accepted' ? 'text-foreground' : 'text-muted-foreground'}>
                      Accepted
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${delivery.status === 'picking_up' || delivery.status === 'in_transit' || delivery.status === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={delivery.status === 'picking_up' || delivery.status === 'in_transit' || delivery.status === 'delivered' ? 'text-foreground' : 'text-muted-foreground'}>
                      Picking Up
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${delivery.status === 'in_transit' || delivery.status === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={delivery.status === 'in_transit' || delivery.status === 'delivered' ? 'text-foreground' : 'text-muted-foreground'}>
                      In Transit
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${delivery.status === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={delivery.status === 'delivered' ? 'text-foreground' : 'text-muted-foreground'}>
                      Delivered
                    </span>
                  </div>
                </div>
              </div>

              <DeliveryMap 
              booking={{
                pickupLat:delivery.pickup_lat,
                pickupLng:delivery.pickup_lng,
                deliveryLat:delivery.delivery_lat,
                deliveryLng:delivery.delivery_lng,
                pickupAddress:delivery.pickup_location,
                deliveryAddress:delivery.delivery_location
              }} 
              mode={userRole ==="driver"?"driver":"user"}
              driverId={userId}             
              />

              {/* Action Buttons */}
              <div className="flex gap-3">
                {delivery.status === 'accepted' && (
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={() => updateStatus('picking_up')}
                  >
                    Start Pickup
                  </Button>
                )}
                {delivery.status === 'picking_up' && (
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={() => updateStatus('in_transit')}
                  >
                    Item Picked Up - Start Delivery
                  </Button>
                )}
                {delivery.status === 'in_transit' && (
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={() => updateStatus('delivered')}
                  >
                    Mark as Delivered
                  </Button>
                )}
                
                {/* DRIVER CONTROLS */}
                {isDriver && (
                  <>
                    {delivery.status === "accepted" && (
                      <Button className="flex-1" onClick={() => updateStatus("picking_up")}>
                        Arrived at Pickup
                      </Button>
                    )}

                    {delivery.status === "picking_up" && (
                      <Button className="flex-1" onClick={() => updateStatus("in_transit")}>
                        Start Delivery
                      </Button>
                    )}

                    {delivery.status === "in_transit" && (
                      <Button className="flex-1" onClick={() => updateStatus("arrived_destination")}>
                        Arrived at Destination
                      </Button>
                    )}
                  </>
                )}

                {delivery.status === 'delivered' && (
                  <div className="flex-1 text-center p-4 bg-success/10 rounded-lg">
                    <p className="text-success font-semibold">Delivery Completed!</p>
                  </div>
                )}
              </div>

              
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
