import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";

const DriverVerification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    ssnLastFour: "",
    licenseNumber: "",
    licenseState: "",
  });
  const [licenseFront, setLicenseFront] = useState<File | null>(null);
  const [licenseBack, setLicenseBack] = useState<File | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      
      // Fetch profile data to auto-populate fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, gender')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setProfileData(profile);
        setFormData(prev => ({
          ...prev,
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          gender: profile.gender || ""
        }));
      }
    };
    checkUser();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      if (side === 'front') setLicenseFront(file);
      else setLicenseBack(file);
    }
  };

  // const fileToBase64 = (file: File): Promise<string> => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = () => resolve(reader.result as string);
  //     reader.onerror = error => reject(error);
  //   });
  // };

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string; 
      const mimeType = file.type || "application/octet-stream";
      // result already contains data:[mime];base64,... so you can strip prefix if needed
      const base64 = result.split(",")[1]; // only the actual Base64 string
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create Veriff session (fast)
      toast({
        title: "Creating verification session...",
        description: "Please wait",
      });

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-veriff-session', {
        body: {
          verification: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            phoneNumber: user?.phone,
            gender: formData.gender,
            email: user?.email,
            licenseNumber: formData.licenseNumber,
            ssnLastFour: formData.ssnLastFour,
            licenseState: formData.licenseState,
          },
        },
      });

      if (sessionError) throw sessionError;
      if (!sessionData?.sessionId) throw new Error("Failed to create session");

      console.log("Session created:", sessionData.sessionId);

      // Step 2: Upload images and submit (can take longer)
      toast({
        title: "Uploading documents...",
        description: "This may take a moment",
      });

      const licenseFrontBase64 = licenseFront ? await fileToBase64(licenseFront) : null;
      const licenseBackBase64 = licenseBack ? await fileToBase64(licenseBack) : null;

      const { error: completeError } = await supabase.functions.invoke('complete-veriff-session', {
        body: {
          sessionId: sessionData.sessionId,
          licenseFrontBase64,
          licenseBackBase64,
        },
      });

      if (completeError) throw completeError;

      toast({
        title: "Success!",
        description: "Your verification has been submitted successfully.",
      });

      navigate("/profile");
    } catch (err: any) {
      console.error("Verification error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/profile")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Driver Verification</CardTitle>
              <CardDescription>
                Complete your verification to start accepting deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    name="gender"
                    value={formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssnLastFour">Last 4 Digits of SSN</Label>
                  <Input
                    type="number"
                    id="ssnLastFour"
                    name="ssnLastFour"
                    maxLength={4}
                    pattern="\d{4}"
                    value={formData.ssnLastFour}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Driver's License Number</Label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseState">State</Label>
                    <Input
                      id="licenseState"
                      name="licenseState"
                      maxLength={2}
                      placeholder="e.g., CA"
                      value={formData.licenseState}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseFront">Driver's License (Front)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="licenseFront"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'front')}
                      required
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseBack">Driver's License (Back)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="licenseBack"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'back')}
                      required
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Verification"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DriverVerification;
