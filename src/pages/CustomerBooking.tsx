import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Truck, LogOut, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { z } from "zod";

const CustomerBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
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
      // Upload receipt to bookingReceipts bucket
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('bookingReceipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Get the public URL for the receipt
      const { data: { publicUrl } } = supabase.storage
        .from('bookingReceipts')
        .getPublicUrl(fileName);

      // Fetch drivers with matching vehicle type and verified status
      const { data: verifiedDrivers } = await supabase
        .from("driver_verifications")
        .select("user_id")
        .eq("verification_status", "verified");

      const verifiedUserIds = verifiedDrivers?.map(d => d.user_id) || [];

      // Fetch drivers with location data
      const { data: matchingDrivers } = await supabase
        .from("driver_vehicles")
        .select(`
          user_id,
          vehicle_type,
          make,
          model,
          year,
          current_lat,
          current_lng,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq("vehicle_type", vehicleType)
        .in("user_id", verifiedUserIds)
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);

      // Calculate distance and sort by proximity if pickup location has coordinates
      let driversWithDistance = matchingDrivers || [];
      if (pickupLat && pickupLng && matchingDrivers) {
        driversWithDistance = matchingDrivers.map((driver: any) => {
          const distance = calculateDistance(
            pickupLat,
            pickupLng,
            driver.current_lat,
            driver.current_lng
          );
          return { ...driver, distance };
        }).sort((a, b) => a.distance - b.distance);
      }

      // Store drivers with the receipt URL for later booking
      const driversWithReceipt = driversWithDistance.map(d => ({ ...d, receiptUrl: publicUrl }));
      setDrivers(driversWithReceipt);
      setShowForm(false);
      
      toast({
        title: "Booking Information Saved",
        description: "Showing available drivers for your delivery",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookDriver = async (driver: any) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create the delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from("deliveries")
        .insert({
          customer_id: user.id,
          pickup_location: pickupLocation,
          delivery_location: deliveryLocation,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng,
          item_description: itemType,
          item_type: itemType,
          quantity: parseInt(quantity),
          vehicle_type: vehicleType,
          price: calculatedPrice,
          estimated_distance: driver.distance,
          receipt_url: driver.receiptUrl,
          status: "pending"
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      toast({
        title: "Booking Created",
        description: "Your delivery request has been created and is now visible to the driver",
      });

      // Navigate to order tracking
      navigate(`/order-tracking/${delivery.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Wehauler
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
                      onChange={(value, lat, lng) => {
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
                      onChange={(value, lat, lng) => {
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
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Enter quantity"
                        required
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
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        required
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                      {receiptFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {receiptFile.name}
                        </p>
                      )}
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

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Finding Drivers..." : "Find Available Drivers"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Available Drivers</h1>
                  <p className="text-muted-foreground">
                    Drivers with {vehicleType} near {pickupLocation}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowForm(true)}>
                  Back to Form
                </Button>
              </div>

              <div className="grid gap-4">
                {drivers.length === 0 ? (
                  <Card className="shadow-medium">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No drivers available with the selected vehicle type at the moment.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  drivers.map((driver) => (
                    <Card key={driver.user_id} className="shadow-medium hover:shadow-elegant transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarFallback>
                                {driver.profiles?.first_name?.[0]}{driver.profiles?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-2">
                              <div>
                                <h3 className="text-xl font-semibold">
                                  {driver.profiles?.first_name} {driver.profiles?.last_name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Truck className="h-4 w-4" />
                                  {driver.year} {driver.make} {driver.model}
                                </div>
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
                        <Button 
                          variant="hero"
                          onClick={() => handleBookDriver(driver)}
                        >
                          Book Now
                        </Button>
                      </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerBooking;
