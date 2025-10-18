import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Package, CheckCircle } from "lucide-react";

const OrderTracking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDelivery = async () => {
      if (!orderId) {
        navigate("/driver/dashboard");
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
        navigate("/driver/dashboard");
        return;
      }

      setDelivery(data);
      setLoading(false);
    };

    fetchDelivery();
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
      accepted: "secondary",
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
          <Button variant="ghost" onClick={() => navigate("/driver/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
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
