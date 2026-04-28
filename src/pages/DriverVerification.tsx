import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { US_STATES } from "@/contants/states";
import { DatePicker } from "@/components/ui/datePicker";
import { useAuth } from "@/hooks/user-auth";
import { useProfile, useVerififcation } from "@/hooks/user-data";
const createWorker = () => new Worker(new URL("@/worker/ImageWorker.tsx", import.meta.url));

const DriverVerification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const {user, role} = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: verification, isLoading: verififcationLoading } = useVerififcation(user?.id, role)
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
    phone: "",
  });
  const [stripeConnect, setStripeConnect] = useState<string | null>(null);
  const [veriffSessionId, setVeriffSessionId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [licenseFront, setLicenseFront] = useState<File | null>(null);
  const [licenseBack, setLicenseBack] = useState<File | null>(null);
  const [userFace, setUserFace] = useState<File | null>(null);
  const [licenseFrontBase64, setLicenseFrontBase64] = useState<{ base64: string; mimeType: string } | null>(null);
  const [licenseBackBase64, setLicenseBackBase64] = useState<{ base64: string; mimeType: string } | null>(null);
  const [userFaceBase64, setUserFaceBase64] = useState<{ base64: string; mimeType: string } | null>(null);
  const [previewFront, setPreviewFront] = useState<string | null>(null);
  const [previewBack, setPreviewBack] = useState<string | null>(null);
  const [previewFace, setPreviewFace] = useState<string | null>(null);
  // const isVerified = verificationStatus?.verification_status === "approved";

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
    if (!user || !profile) return;
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        gender: profile.gender || "",
      }));
    }
    setStripeConnect(profile.stripe_connect_id);
    setVeriffSessionId(verification?.veriff_session_id);
    setIsVerified(verification?.verification_status === "approved");
    
  }, [user, profile, verification]);
  // console.log('stripe connectid and verification status', stripeConnect, veriffSessionId, isVerified);
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // console.log(formData.licenseState);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back" | "face") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewURL = URL.createObjectURL(file);

    if (side === "front") {
      setLicenseFront(file);
      setPreviewFront(previewURL);
      convertWithWorker(file, workerFront.current!).then((result) => setLicenseFrontBase64(result));
    } else if (side === "back") {
      setLicenseBack(file);
      setPreviewBack(previewURL);
      convertWithWorker(file, workerBack.current!).then((result) => setLicenseBackBase64(result));
    } else if (side === "face") {
      setUserFace(file);
      setPreviewFace(previewURL);
      convertWithWorker(file, workerFront.current!).then((result) => setUserFaceBase64(result));
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
      if (!formData.dateOfBirth) {
        throw new Error("Date of birth is required");
      }

      const date = new Date(formData.dateOfBirth);
      const dobYear = String(date.getFullYear());
      const dobMonth = String(date.getMonth() + 1).padStart(2, "0");
      const dobDay = String(date.getDate()).padStart(2, "0");

      const dob = `${dobYear}-${dobMonth}-${dobDay}`;
      // console.log("dob", dob);

      // console.log("addressData:", formData.addressData);

      if (!isVerified) {
        // Use a local variable to track the session ID throughout this function
        let currentSessionId = veriffSessionId;

        if (!currentSessionId) {
          const { data: sessionData, error: sessionError } = await supabase.functions.invoke("create-veriff-session", {
            body: {
              verification: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: dob,
                phoneNumber: formData.phone,
                idNumber: formData.ssnLastFour,
                gender: formData.gender,
                email: user?.email,
                licenseNumber: formData.licenseNumber,
              },
            },
          });

          if (sessionError) throw sessionError;
          if (!sessionData?.sessionId) throw new Error("Failed to create session");

          currentSessionId = sessionData.sessionId;
          setVeriffSessionId(currentSessionId);
          // console.log("Session created:", currentSessionId);
        }

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
              sessionId: currentSessionId,
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
              sessionId: currentSessionId,
              imageBase64: back.base64,
              mimeType: back.mimeType,
              imageType: "document-back",
            },
          });
          if (backError) throw backError;
        }
        // Step 4: Upload user face image
        toast({
          title: "Uploading face image...",
          description: "Please wait",
        });
        const face = userFaceBase64 || (userFace ? await convertWithWorker(userFace, workerFront.current!) : null);

        if (face) {
          const { error: faceError } = await supabase.functions.invoke("upload-veriff-image", {
            body: {
              sessionId: currentSessionId,
              imageBase64: face.base64,
              mimeType: face.mimeType,
              imageType: "face",
            },
          });
          if (faceError) throw faceError;
        }
        // Step 4: Submit session
        toast({
          title: "Submitting verification...",
          description: "Almost done",
        });

        const { error: submitError } = await supabase.functions.invoke("submit-veriff-session", {
          body: {
            sessionId: currentSessionId,
          },
        });

        if (submitError) throw submitError;
      }

      if (stripeConnect === null) {
        const formDataToSend = new FormData();
        // Add text fields
        formDataToSend.append("firstName", formData.firstName);
        formDataToSend.append("lastName", formData.lastName);
        formDataToSend.append("dobday", dobDay);
        formDataToSend.append("dobmonth", dobMonth);
        formDataToSend.append("dobyear", dobYear);
        formDataToSend.append("phoneNumber", formData.phone);
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
        // console.log("Stripe response:", accountData);

        // if (stripeError) throw sessionError;
        // if (!accountData?.accountId) throw new Error("Failed to create Connect account");

        // console.log("Stripe connect account created:", accountData?.accountId);
      }

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
                  <DatePicker
                    id="dateOfBirth"
                    name=""
                    // enableTime
                    value={formData.dateOfBirth}
                    onChange={([date]) => {
                      handleInputChange({ target: { name: "dateOfBirth", value: date } });
                    }}
                  />

                  {/* <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                  /> */}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssnLastFour">Last 4 Digits of SSN</Label>
                  <Input
                    type="number"
                    id="ssnLastFour"
                    name="ssnLastFour"
                    pattern="\d{4}"
                    placeholder="XXXX1234"
                    value={formData.ssnLastFour}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFormData((prev) => ({
                        ...prev,
                        ssnLastFour: value,
                      }));
                    }}
                    // minLength={4}
                    maxLength={4}
                    required
                    className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                      minLength={9}
                      type="text"
                      placeholder="A12345678"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseState">State</Label>
                    <select
                      id="licenseState"
                      value={formData.licenseState}
                      name="licenseState"
                      onChange={handleInputChange}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="" disabled>
                        Select state
                      </option>

                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </select>

                    {/* <Input
                      id="licenseState"
                      name="licenseState"
                      maxLength={2}
                      placeholder="e.g., CA"
                      value={formData.licenseState}
                      onChange={handleInputChange}
                      required
                    /> */}
                  </div>
                </div>

                <p className="italic">All images must be clear and well-lit.</p>
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

                {/* USER FACE IMAGE */}
                <div className="space-y-2">
                  <Label htmlFor="faceImage">User Face Image</Label>
                  <div className="w-full h-[200px] border rounded-md flex items-center justify-center overflow-hidden bg-muted cursor-pointer relative">
                    {previewFace ? (
                      <img src={previewFace} alt="Face Preview" className="h-full w-auto object-cover" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Click to upload image with your face</span>
                    )}
                    <Input
                      type="file"
                      className="absolute opacity-0 cursor-pointer h-full w-full"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "face")}
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
