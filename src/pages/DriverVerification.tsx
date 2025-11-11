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
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert images to base64
      let licenseFrontBase64 = null;
      let licenseBackBase64 = null;

      if (licenseFront) {
        licenseFrontBase64 = await fileToBase64(licenseFront);
      }
      if (licenseBack) {
        licenseBackBase64 = await fileToBase64(licenseBack);
      }

      // Send everything to edge function
      const { data, error } = await supabase.functions.invoke(
        'create-veriff-session',
        {
          body: {
            verification: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              licenseNumber: formData.licenseNumber,
              ssnLastFour: formData.ssnLastFour,
              licenseState: formData.licenseState,
            },
            licenseFrontBase64,
            licenseBackBase64,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Verification Submitted",
        description: "Your verification documents have been submitted to Veriff for review.",
      });

      navigate("/profile");
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit verification",
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
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
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
