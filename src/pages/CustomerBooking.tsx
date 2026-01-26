import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Truck, LogOut, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { z } from "zod";
import PaymentForm from "@/components/PaymentElement";
import logo from "@/assets/logo.png";
import ResponsivePaymentModal  from "@/components/ui/modal";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle } from "lucide-react";


const CustomerBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingDeliveryId, setPendingDeliveryId] = useState<string | null>(null);
  const [driverNotFound, setdriverNotFound] = useState(false);
  const [acceptedDelivery, setAcceptedDelivery] = useState<any>(null);
  const [acceptedDriver, setAcceptedDriver] = useState<any>(null);
  const [showAcceptedDialog, setShowAcceptedDialog] = useState(false);
  const [navigationCountdown, setNavigationCountdown] = useState<number | null>(null);

  // Form state
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupLat, setPickupLat] = useState<number | undefined>();
  const [pickupLng, setPickupLng] = useState<number | undefined>();
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | undefined>();
  const [deliveryLng, setDeliveryLng] = useState<number | undefined>();
  const [itemType, setItemType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  type PaymentModalState = {
    open: boolean;
    clientSecret?: string;
    onSuccess?: () => Promise<void>;
  };

  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({ open: false });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      
      // Fetch unique vehicle types
      const { data: vehicles } = await supabase
        .from("driver_vehicles")
        .select("vehicle_type");
      
      if (vehicles) {
        const uniqueTypes = [...new Set(vehicles.map(v => v.vehicle_type))];
        setVehicleTypes(uniqueTypes);
      }
    };
    checkUser();
  }, [navigate]);
  

  // Update price when pickup and delivery locations change
  useEffect(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      const distance = calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
      const price = calculatePrice(distance);
      setCalculatedPrice(price);
    } else {
      setCalculatedPrice(null);
    }
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  // Countdown timer for auto-showing payment
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      if (countdown - 1 === 0) {
        handleAutoPayment();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Listen for driver acceptance in realtime
  useEffect(() => {
    if (!pendingDeliveryId || !user) return;

    console.log("Setting up subscription for delivery:", pendingDeliveryId);

    const channel = supabase
      .channel(`delivery-acceptance-${pendingDeliveryId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
          filter: `id=eq.${pendingDeliveryId}`,
        },
        async (payload) => {
          console.log("Delivery updated:", payload.new);
          
          const updatedDelivery = payload.new as any;

          // Check if a driver has accepted (status changed to 'accepted' and driver_id is set)
          if (updatedDelivery.status === "accepted" && updatedDelivery.driver_id !== null ) {
            console.log("Driver accepted delivery!");
            
            
            // Find the driver from the existing drivers list
            const acceptedDriverData = drivers.find(
              (driver) => driver.user_id === updatedDelivery.driver_id
            );
            setAcceptedDelivery(updatedDelivery);
            setAcceptedDriver(acceptedDriverData);
            setShowAcceptedDialog(true);
            setNavigationCountdown(30);

            toast({
              title: "Driver Accepted!",
              description: `${acceptedDriverData.profiles.first_name} ${acceptedDriverData.profiles.last_name} has accepted your delivery`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to delivery updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - subscription failed');
          toast({
            title: "Connection Error",
            description: "Failed to subscribe to delivery updates",
            variant: "destructive",
          });
        }
      });

    return () => {
      console.log("Cleaning up delivery subscription");
      supabase.removeChannel(channel);
    };
  }, [pendingDeliveryId, user, toast]);

  // Auto-navigate countdown when driver accepts
  useEffect(() => {
    if (navigationCountdown === null || navigationCountdown <= 0) return;

    const timer = setTimeout(() => {
      setNavigationCountdown(navigationCountdown - 1);
      
      if (navigationCountdown - 1 === 0 && acceptedDelivery) {
        // Navigate to tracking page
        navigate(`/order-tracking?id=${acceptedDelivery.id}`);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigationCountdown, acceptedDelivery, navigate]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Calculate price based on distance
  const calculatePrice = (distanceKm: number) => {
    const distanceMiles = distanceKm * 0.621371; // Convert km to miles
    return distanceMiles <= 50 ? 60 : 85;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Verify MIME type is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        e.target.value = ''; // Reset the input
        setReceiptFile(null);
        return;
      }
      
      setReceiptFile(file);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate inputs with Zod
    const bookingSchema = z.object({
      pickupLocation: z.string().trim().min(3, "Pickup location must be at least 3 characters").max(200, "Pickup location is too long"),
      deliveryLocation: z.string().trim().min(3, "Delivery location must be at least 3 characters").max(200, "Delivery location is too long"),
      itemType: z.string().trim().min(1, "Item type is required").max(100, "Item type is too long"),
      quantity: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be positive").max(1000, "Quantity cannot exceed 1000"),
      vehicleType: z.string().trim().min(1, "Vehicle type is required").max(50, "Vehicle type is too long"),
      receiptFile: z.instanceof(File, { message: "Receipt file is required" })
    });

    const validation = bookingSchema.safeParse({
      pickupLocation,
      deliveryLocation,
      itemType,
      quantity,
      vehicleType,
      receiptFile
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Fetch drivers with matching vehicle type and verified status
      const { data: availableDriver, error } = await supabase.rpc("check_driver_availability",{
        p_vehicle_type: vehicleType,
        p_pickup_lat: pickupLat,
        p_pickup_lng: pickupLng,
        p_km_radius: 5,
      });

      if (error) {
        console.log("Error fetching drivers:", error.message);
      };
      // const { data: verifiedDrivers } = await supabase
      //   .from("driver_verifications")
      //   .select("user_id")
      //   .eq("verification_status", 'approved');
      //   const verifiedUserIds = verifiedDrivers?.map(d => d.user_id);
      //   console.log("verified drivers",verifiedUserIds);

      // // Fetch drivers who are currently busy
      
      // const { data: busyDeliveries } = await supabase
      //   .from("deliveries")
      //   .select("driver_id")
      //   .in("status", ["accepted", "in_progress", "in_transit"]);

      //   console.log("busy drivers",busyDeliveries);

      // const busyDriverIds = busyDeliveries?.map(d => d.driver_id) ?? [];

      // // Fetch drivers with location data
      // let query = supabase
      //   .from("driver_vehicles")
      //   .select(`user_id, vehicle_type, make, model, year, current_lat, current_lng, license_plate, color, profiles:user_id(first_name, last_name, phone, avatar_url, gender`)
      //   .eq("vehicle_type", vehicleType)
      //   .eq("is_online", true)
      //   .in("user_id", verifiedUserIds)
      //   .not("user_id", "in", `(${busyDriverIds.join(",")})`)
      //   .not("current_lat", "is", null)
      //   .not("current_lng", "is", null);

      // if (busyDriverIds.length > 0) {
      //   query = query.not("user_id", "in", `(${busyDriverIds.join(",")})`);
      // }

      // const { data: matchingDrivers, error } = await query;

      // console.log("matched drivers",matchingDrivers);
  

      // // Calculate distance and sort by proximity if pickup location has coordinates
      // let driversWithDistance = matchingDrivers;

      // if (pickupLat && pickupLng && matchingDrivers) {
      //   driversWithDistance = matchingDrivers.map((driver: any) => {
      //     const distance = calculateDistance(
      //       pickupLat,
      //       pickupLng,
      //       driver.current_lat,
      //       driver.current_lng
      //     );
      //     return { ...driver, distance };
      //   }).sort((a, b) => a.distance - b.distance);
      // }

      // // Store drivers with the receipt URL for later booking
      // const driversWithReceipt = driversWithDistance.map(d => ({ ...d, receiptUrl: publicUrl }));
      setdriverNotFound(!availableDriver);
      setDrivers(availableDriver);
      
      // setDrivers(driversWithReceipt);
      setShowForm(false);
      const drivers = Array.isArray(availableDriver)
        ? availableDriver
        : [];

      if (drivers.length === 0) {
        // no drivers
      }else{
        setCountdown(30);
      }
      
      // if (availableDriver.length >= 1) {
      //   // Start 1-minute countdown
        
      // }
      
      toast({
        title: driverNotFound ? "No Drivers Available" : "Drivers Matched!",
        description: driverNotFound
          ? "No nearby drivers are currently available. Please try again shortly."
          : `Found ${availableDriver.length} available drivers. Payment will show in 1 minute.`,
      });
    } catch (error: any) {
      console.log(error.message)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPayment = async () => {
    if (!user || !calculatedPrice) return;

    setLoading(true);

    try {
      // Call edge function to create PaymentIntent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: calculatedPrice,
          currency: "usd",
        },
      });

      if (error) throw error;

     const clientSecret = data.clientSecret;
     setClientSecret(clientSecret);

      // toast({
      //   title: "Payment Ready",
      //   description: "Please complete payment to notify drivers",
      // });
   
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!user || !calculatedPrice) return;

    setLoading(true);

      // Upload receipt to bookingReceipts bucket
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('bookingReceipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Store just the file path (signed URLs will be generated when viewing)
      const receiptPath = fileName;

    try {
      // Create delivery with pending status (no driver assigned yet)
      const { data: delivery, error } = await supabase
        .rpc("create_delivery",{
          pickup_location: pickupLocation,
          delivery_location: deliveryLocation,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng,
          item_type: itemType,
          quantity: parseInt(quantity),
          vehicle_type: vehicleType,
          price: calculatedPrice,
          receipt_url: receiptPath,
          payment_intent_id: paymentIntentId,
        });

      if (error) throw error;

      setPendingDeliveryId(delivery);

      setClientSecret(null);

      toast({ 
        title: "Payment Successful!", 
        description: "Notifying matched drivers. Waiting for acceptance..." 
      });

      // Navigate to tracking page
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col justify-start items-start h-full">
            <img
              src={logo}
              alt="Wehauler Logo"
              className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
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
        <div className="max-w-4xl mx-auto space-y-6">
          {showForm ? (
            <>
              <div>
                <h1 className="text-3xl font-bold mb-2">Book a Delivery</h1>
                <p className="text-muted-foreground">Fill in the details for your delivery</p>
              </div>

              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitBooking} className="space-y-4">
                      <GooglePlacesAutocomplete
                        id="pickupLocation"
                        label="Pickup Location"
                        placeholder="Enter pickup address"
                        value={pickupLocation}
                        onChange={(value, addressData,lat, lng) => {
                          setPickupLocation(value);
                          setPickupLat(lat);
                          setPickupLng(lng);
                        }}
                        required
                      />

                      <GooglePlacesAutocomplete
                        id="deliveryLocation"
                        label="Delivery Location"
                        placeholder="Enter delivery address"
                        value={deliveryLocation}
                        onChange={(value,addressData, lat, lng) => {
                          setDeliveryLocation(value);
                          setDeliveryLat(lat);
                          setDeliveryLng(lng);
                        }}
                        required
                      />

                      <div className="space-y-2">
                        <Label htmlFor="itemType">Item Type</Label>
                        <Select value={itemType} onValueChange={setItemType} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Appliances">Appliances</SelectItem>
                            <SelectItem value="Furniture">Furniture</SelectItem>
                            <SelectItem value="Lumber">Lumber</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                            <SelectItem value="Building Materials">Building Materials</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="Enter quantity"
                          required
                          className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vehicleType">Vehicle Type Required</Label>
                        <Select value={vehicleType} onValueChange={setVehicleType} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicleTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="receipt">Order Receipt</Label>
                        <div className="w-full h-[200px] border rounded-md flex items-center justify-center overflow-hidden bg-muted cursor-pointer relative">
                          {receiptFile? (
                            <img src={URL.createObjectURL(receiptFile)} alt="Receipt Preview" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm text-muted-foreground">Click to upload Receipt</span>
                          )}
                          <Input
                            id="receipt"
                            type="file"
                            className="absolute opacity-0 cursor-pointer h-full w-full"
                            accept="image/*"
                            capture="environment"
                            required
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>
                      {calculatedPrice && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Estimated Price</span>
                              <span className="text-2xl font-bold text-primary">
                                ${calculatedPrice}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {calculatedPrice === 60 ? "Within 50 miles" : "Beyond 50 miles"}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      <div className="flex flex-row justify-evenly mt-4 gap-4">
                        <Button 
                        className="flex-1"
                          type="button" 
                          variant="outline"
                          onClick={() => navigate("/customer/dashboard")} // go back to dashboard
                        >
                          Cancel
                        </Button>

                        <Button type="submit" className="flex-1" disabled={loading}>
                          {loading ? "Finding Drivers..." : "Find Available Drivers"}
                        </Button>
                      </div>
                      {/* <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Finding Drivers..." : "Find Available Drivers"}
                      </Button> */}
                  </form>
                </CardContent>
              </Card>
            </>
          ) : clientSecret ? (
              <ResponsivePaymentModal
                isOpen={!!clientSecret}
                onClose={() => setClientSecret(null)}
                title="Add Payment Method"
                clientSecret={clientSecret}
              >
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onFailure={(failed) => setPaymentFailed(failed)}
                />
              </ResponsivePaymentModal>
          ) : (
            <>
             {drivers.length !==0 &&  <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Available Drivers</h1>
                  <p className="text-muted-foreground">
                    {countdown !== null && countdown > 0 
                      ? `Payment will show automatically in ${countdown}s` 
                      : `Drivers with ${vehicleType} near ${pickupLocation}`}
                  </p>
                </div>
                {!countdown && (
                  <Button variant="outline" onClick={() => {
                    setShowForm(true);
                    setDrivers([]);
                    setPaymentModal({open:false});
                  }}>
                    Back to Form
                  </Button>
                )}
              </div>}

              {drivers.length !==0 && countdown !== null && countdown > 0 && (
                <Card className="border-primary">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="text-6xl font-bold text-primary">{countdown}</div>
                      <p className="text-lg">Payment will appear automatically...</p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setCountdown(null);
                          handleAutoPayment();
                        }}
                      >
                        Show Payment Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {drivers.length === 0 ? (
                  // setCountdown(null),
                  <Card className="shadow-medium">
                    <CardHeader> 
                      <CardTitle className="text-3xl font-bold mb-2">
                        Available Drivers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground mb-10">
                        No drivers available with the selected vehicle type at the moment.
                      </p>
                       <Button variant="outline" onClick={() => {
                        setShowForm(true);
                        setDrivers([]);
                      }}>
                        Back to Form
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  drivers.map((driver) => (
                    <Card key={driver.user_id} className="shadow-medium hover:shadow-elegant transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <Avatar className="h-16 w-16">
                             <AvatarImage src={driver.profiles.avatar_url} />
                            <AvatarFallback>
                              {driver.profiles?.first_name?.[0]}{driver.profiles?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <div>
                              <h3 className="text-xl font-semibold">
                                {driver.profiles?.first_name} {driver.profiles?.last_name}
                              </h3>
                              <div className="flex flex-row items-center gap-4 text-sm text-muted-foreground">
                                <Truck className="h-4 w-4" />
                                {driver.year} {driver.make} {driver.model} {driver.color} {driver.type}
                              </div>
                              <div className="text-sm"> {driver.license_plate}</div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">Verified Driver</span>
                              </div>
                              {driver.distance && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{driver.distance.toFixed(1)} km away</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                  
                )}
              </div>

              {/* Driver Accepted Dialog */}
              <AlertDialog open={showAcceptedDialog} onOpenChange={setShowAcceptedDialog}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <div className="flex items-center justify-center mb-4">
                      <div className="rounded-full bg-green-100 p-3">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      </div>
                    </div>
                    <AlertDialogTitle className="text-center text-2xl">
                      Driver Accepted!
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                      Your delivery has been accepted
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {acceptedDriver && (
                    <div className="space-y-4">
                      {/* Driver Info */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                              {acceptedDriver.profiles?.avatar_url ? (
                                <AvatarImage src={acceptedDriver.profiles.avatar_url} />
                              ) : (
                                <AvatarFallback className="text-lg">
                                  {acceptedDriver.profiles?.first_name?.[0]}
                                  {acceptedDriver.profiles?.last_name?.[0]}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">
                                {acceptedDriver.profiles?.first_name} {acceptedDriver.profiles?.last_name}
                              </h3>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Truck className="h-4 w-4" />
                                <span>
                                  {acceptedDriver.year} {acceptedDriver.make} {acceptedDriver.model}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {acceptedDriver.color} • {acceptedDriver.license_plate}
                              </p>
                              {acceptedDriver.profiles?.phone && (
                                <p className="text-sm text-muted-foreground">
                                  📞 {acceptedDriver.profiles.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Countdown Timer */}
                      {navigationCountdown !== null && navigationCountdown > 0 && (
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-3xl font-bold text-primary mb-2">
                            {navigationCountdown}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Redirecting to tracking page...
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAcceptedDialog(false);
                        setNavigationCountdown(null);
                      }}
                      className="w-full sm:w-auto"
                    >
                      Stay Here
                    </Button>
                    <Button
                      onClick={() => {
                        if (acceptedDelivery) {
                          navigate(`/order-tracking?id=${acceptedDelivery.id}`);
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      Go to Tracking Now
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerBooking;
