import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Star, 
  Shield, 
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Camera,
  Edit3,
  Truck,
  Award,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [driverStats, setDriverStats] = useState({
    totalDeliveries: 0,
    rating: 0,
    memberSince: "",
  });
  const [vehicle, setVehicle] = useState({
    vehicleType: "",
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    insuranceNumber: "",
    trackingConsent: false,
  });
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "", 
    email: "",
    phone: "",
    avatarUrl: "",
    gender: ""
  });


  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(roleData?.role || null);

      // Get profile data
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        email: user.email || "",
        phone: profileData.phone || "",
        avatarUrl: profileData.avatar_url || "",
        gender: profileData.gender || ""
      });

      // Fetch vehicle info if driver
      if (roleData?.role === 'driver') {
        const { data: vehicleData } = await supabase
          .from('driver_vehicles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (vehicleData) {
          setVehicle({
            vehicleType: vehicleData.vehicle_type || "",
            make: vehicleData.make || "",
            model: vehicleData.model || "",
            year: vehicleData.year?.toString() || "",
            licensePlate: vehicleData.license_plate || "",
            insuranceNumber: vehicleData.insurance_number || "",
            trackingConsent: vehicleData.tracking_consent || false,
          });
        }

        // Fetch verification status
        const { data: verificationData } = await supabase
          .from('driver_verifications')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setVerification(verificationData);

        // Fetch driver stats
        const { data: allDeliveries } = await supabase
          .from('deliveries')
          .select('customer_rating')
          .eq('driver_id', user.id)
          .eq('status', 'delivered');

        const totalDeliveries = allDeliveries?.length || 0;
        
        // Calculate average rating from all completed deliveries
        const ratingsData = allDeliveries?.filter(d => d.customer_rating) || [];
        const avgRating = ratingsData.length > 0
          ? ratingsData.reduce((sum, d) => sum + (d.customer_rating || 0), 0) / ratingsData.length
          : 0;

        setDriverStats({
          totalDeliveries,
          rating: Number(avgRating.toFixed(1)),
          memberSince: new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone
        })
        .eq("id", userId);

      if (error) throw error;

      // Save vehicle info if driver
      if (userRole === 'driver') {
        // Get current location if tracking consent is enabled
        let currentLat = null;
        let currentLng = null;
        
        if (vehicle.trackingConsent) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
          } catch (geoError) {
            console.error("Location error:", geoError);
          }
        }

        const { error: vehicleError } = await supabase
          .from('driver_vehicles')
          .upsert({
            user_id: userId,
            vehicle_type: vehicle.vehicleType,
            make: vehicle.make,
            model: vehicle.model,
            year: parseInt(vehicle.year),
            license_plate: vehicle.licensePlate,
            insurance_number: vehicle.insuranceNumber,
            tracking_consent: vehicle.trackingConsent,
            current_lat: currentLat,
            current_lng: currentLng,
            last_location_update: currentLat && currentLng ? new Date().toISOString() : null,
          });

        if (vehicleError) throw vehicleError;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    try {
      setUploading(true);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatarUrl: publicUrl });

      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
    navigate("/login");
  };

  const handleBackNavigation = () => {
    if (userRole === "driver") {
      navigate("/driver/dashboard");
    } else {
      navigate("/customer/dashboard");
    }
  };

  const isVerified = verification?.verification_status === 'approved';

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackNavigation}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {profile.avatarUrl ? (
                    <AvatarImage src={profile.avatarUrl} alt="Profile" />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  variant="secondary"
                  onClick={handleImageClick}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      {isVerified && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified {userRole === "driver" ? "Driver" : "Customer"}
                        </Badge>
                      )}
                      {!isVerified && userRole === 'driver' && verification?.verification_status === 'pending' && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Verification Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>

                {/* Stats - Only show for drivers */}
                {userRole === 'driver' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <Truck className="h-4 w-4" />
                        <span>{driverStats.totalDeliveries}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Total Deliveries</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{driverStats.rating || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <Award className="h-4 w-4" />
                        <span>{driverStats.memberSince}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Member Since</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Manage your account details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              {profile.gender && (
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}

              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="hero" onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information Card - Only for Drivers */}
          {userRole === 'driver' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Vehicle Information
                </CardTitle>
                <CardDescription>
                  Enter your vehicle details to accept deliveries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Input
                      id="vehicleType"
                      placeholder="e.g., Pickup Truck"
                      value={vehicle.vehicleType}
                      onChange={(e) => setVehicle({ ...vehicle, vehicleType: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      placeholder="e.g., Ford"
                      value={vehicle.make}
                      onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="e.g., F-150"
                      value={vehicle.model}
                      onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      placeholder="e.g., 2020"
                      value={vehicle.year}
                      onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">License Plate</Label>
                    <Input
                      id="licensePlate"
                      placeholder="e.g., ABC1234"
                      value={vehicle.licensePlate}
                      onChange={(e) => setVehicle({ ...vehicle, licensePlate: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceNumber">Insurance Number</Label>
                    <Input
                      id="insuranceNumber"
                      placeholder="Optional"
                      value={vehicle.insuranceNumber}
                      onChange={(e) => setVehicle({ ...vehicle, insuranceNumber: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trackingConsent"
                    checked={vehicle.trackingConsent}
                    onCheckedChange={(checked) => 
                      setVehicle({ ...vehicle, trackingConsent: checked as boolean })
                    }
                    disabled={!isEditing}
                  />
                  <Label htmlFor="trackingConsent" className="text-sm">
                    I agree to location tracking during active deliveries
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings & Preferences */}
          {/* <div className="space-y-6"> */}
            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Delivery Updates</div>
                    <div className="text-xs text-muted-foreground">Get notified about your deliveries</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">New Driver Offers</div>
                    <div className="text-xs text-muted-foreground">Notifications when drivers accept your requests</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Marketing Emails</div>
                    <div className="text-xs text-muted-foreground">Promotional offers and updates</div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

           
          {/* </div>  */}
          {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Manage your payment options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-xs font-medium">
                      VISA
                    </div>
                    <div>
                      <div className="text-sm font-medium">•••• 4242</div>
                      <div className="text-xs text-muted-foreground">Expires 12/25</div>
                    </div>
                  </div>
                  <Badge variant="secondary">Default</Badge>
                </div>
                
                <Button variant="outline" className="w-full">
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>

            {/* Verification Card - Only for Drivers */}
            {userRole === 'driver' && !isVerified && (
              <Card className="h-46">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Driver Verification
                  </CardTitle>
                  <CardDescription>
                    Complete verification to start accepting deliveries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => navigate("/driver/verification")}
                  >
                    {verification?.verification_status === 'pending' ? 'View Verification Status' : 'Verify Now'}
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
    
            <Button variant="destructive" className="w-full justify-start">
              Delete Account
            </Button>  
            {/* <Separator />
            <Button variant="outline" className="w-full justify-start">
              Download My Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Privacy Settings
            </Button> */}
          
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;