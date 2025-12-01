import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { add } from "date-fns";
const createWorker = () => new Worker(new URL("@/worker/ImageWorker.tsx", import.meta.url));

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
    address: "",
    addressData: {} as any,
    ssnLastFour: "",
    licenseNumber: "",
    licenseState: "",
  });
  const [address, setAddress] = useState<string | null>(null);
  const [licenseFront, setLicenseFront] = useState<File | null>(null);
  const [licenseBack, setLicenseBack] = useState<File | null>(null);
  const [licenseFrontBase64, setLicenseFrontBase64] = useState<{ base64: string; mimeType: string } | null>(null);
  const [licenseBackBase64, setLicenseBackBase64] = useState<{ base64: string; mimeType: string } | null>(null);
  const [previewFront, setPreviewFront] = useState<string | null>(null);
  const [previewBack, setPreviewBack] = useState<string | null>(null);

  const workerFront = useRef<Worker>();
  const workerBack = useRef<Worker>();

  useEffect(() => {
    workerFront.current = createWorker();
    workerBack.current = createWorker();

    return () => {
      workerFront.current?.terminate();
      workerBack.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);

      // Fetch profile data to auto-populate fields
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, gender")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setProfileData(profile);
        setFormData((prev) => ({
          ...prev,
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          gender: profile.gender || "",
        }));
      }
    };
    checkUser();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewURL = URL.createObjectURL(file);

    if (side === "front") {
      setLicenseFront(file);
      setPreviewFront(previewURL);
      convertWithWorker(file, workerFront.current!).then((result) => setLicenseFrontBase64(result));
    } else {
      setLicenseBack(file);
      setPreviewBack(previewURL);
      convertWithWorker(file, workerBack.current!).then((result) => setLicenseBackBase64(result));
    }
  };
  const convertWithWorker = (file: File, worker: Worker) => {
    return new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
      worker.postMessage(file);
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.error) reject(e.data.error);
        else resolve(e.data);
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      toast({
        title: "Creating verification session...",
        description: "Please wait",
      });
      const [dobYear, dobMonth, dobDay] = formData.dateOfBirth.split("-");
      console.log("address:", formData.address);
      console.log("addressData:", formData.addressData);
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke("create-veriff-session", {
        body: {
          verification: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            phoneNumber: user?.phone,
            gender: formData.gender,
            email: user?.email,
            licenseNumber: formData.licenseNumber,
          },
        },
      });

      if (sessionError) throw sessionError;
      if (!sessionData?.sessionId) throw new Error("Failed to create session");

      console.log("Session created:", sessionData.sessionId);

      // Step 2: Upload front image
      toast({
        title: "Uploading front of license...",
        description: "Please wait",
      });

      const front =
        licenseFrontBase64 || (licenseFront ? await convertWithWorker(licenseFront, workerFront.current!) : null);

      if (front) {
        const { error: frontError } = await supabase.functions.invoke("upload-veriff-image", {
          body: {
            sessionId: sessionData.sessionId,
            imageBase64: front.base64,
            mimeType: front.mimeType,
            imageType: "document-front",
          },
        });
        if (frontError) throw frontError;
      }

      // Step 3: Upload back image
      toast({
        title: "Uploading back of license...",
        description: "Please wait",
      });

      const back =
        licenseBackBase64 || (licenseBack ? await convertWithWorker(licenseBack, workerBack.current!) : null);

      if (back) {
        const { error: backError } = await supabase.functions.invoke("upload-veriff-image", {
          body: {
            sessionId: sessionData.sessionId,
            imageBase64: back.base64,
            mimeType: back.mimeType,
            imageType: "document-back",
          },
        });
        if (backError) throw backError;
      }

      // Step 4: Submit session
      toast({
        title: "Submitting verification...",
        description: "Almost done",
      });

      const { error: submitError } = await supabase.functions.invoke("submit-veriff-session", {
        body: {
          sessionId: sessionData.sessionId,
        },
      });

      if (submitError) throw submitError;
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("dobday", dobDay);
      formDataToSend.append("dobmonth", dobMonth);
      formDataToSend.append("dobyear", dobYear);
      formDataToSend.append("phoneNumber", user?.phone ?? "");
      formDataToSend.append("gender", formData.gender);
      formDataToSend.append("email", user?.email ?? "");
      formDataToSend.append("licenseNumber", formData.licenseNumber);
      formDataToSend.append("ssnLastFour", formData.ssnLastFour);
      formDataToSend.append("licenseState", formData.licenseState);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("line", formData.addressData.line1);
      formDataToSend.append("city", formData.addressData.city);
      formDataToSend.append("state", formData.addressData.state);
      formDataToSend.append("postal_code", formData.addressData.postal_code);
      formDataToSend.append("country", formData.addressData.country);

      // Add the actual files
      formDataToSend.append("licenseFront", licenseFront!);
      formDataToSend.append("licenseBack", licenseBack!);

      const { data: accountData, error: stripeError } = await supabase.functions.invoke("create-stripe-connect", {
        body: formDataToSend,
      });

      if (stripeError) throw stripeError;
      console.log("Stripe response:", accountData);

      // if (stripeError) throw sessionError;
      // if (!accountData?.accountId) throw new Error("Failed to create Connect account");

      // console.log("Stripe connect account created:", accountData?.accountId);

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
              <CardDescription>Complete your verification to start accepting deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" value={formData.lastName} disabled className="bg-muted" />
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
                    minLength={4}
                    maxLength={4}
                    pattern="\d{4}"
                    value={formData.ssnLastFour}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Enter Your Address</Label>
                  <GooglePlacesAutocomplete
                    id="address"
                    label=""
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={(value, addressData) => {
                      setFormData((prev) => ({
                        ...prev,
                        address: value,
                        addressData: {
                          ...addressData,
                        },
                      }));
                      console.log(
                        "Selected address:",
                        addressData.line1,
                        addressData.city,
                        addressData.state,
                        addressData.postal_code,
                        addressData.country,
                      );
                    }}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Driver's License Number</Label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
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
                {/* FRONT IMAGE */}
                <div className="space-y-2">
                  <Label htmlFor="licenseFront">Driver's License (Front)</Label>
                  <div className="w-full h-[200px] border rounded-md flex items-center justify-center overflow-hidden bg-muted cursor-pointer relative">
                    {previewFront ? (
                      <img src={previewFront} alt="Front Preview" className="h-full w-auto object-cover" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Click to upload front image</span>
                    )}
                    <Input
                      type="file"
                      className="absolute opacity-0 cursor-pointer h-full w-full"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "front")}
                    />
                  </div>
                </div>

                {/* BACK IMAGE */}
                <div className="space-y-2">
                  <Label htmlFor="licenseBack">Driver's License (Back)</Label>
                  <div className="w-full h-[200px] border rounded-md flex items-center justify-center overflow-hidden bg-muted cursor-pointer relative">
                    {previewBack ? (
                      <img src={previewBack} alt="Back Preview" className="h-full w-auto object-cover" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Click to upload back image</span>
                    )}
                    <Input
                      type="file"
                      className="absolute opacity-0 cursor-pointer h-full w-full"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "back")}
                    />
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
