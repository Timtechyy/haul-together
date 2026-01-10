import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Checkbox } from "@/components/ui/checkbox";


interface PlateData{
    Id:string;
    state:string;
}
interface Details{
    userId: string ;
    onComplete: () => void;
}
export  default function LicensePlate({userId, onComplete}:Details){

    const [vehicleResult, setVehicleResult] = useState(null);
      const [vehicleTracking, setVehicleTracking] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


     const saveVehicle = async () => {
    await supabase.from("driver_vehicles").update({
        vehicle_type: vehicleResult.vehicleType,
        make: vehicleResult.make,
        model: vehicleResult.model,
        year: parseInt(vehicleResult.year),
        license_plate: keyword.plateNumber,
        tracking_consent:vehicleTracking,
    }).eq("user_id", userId);

    onComplete();
  };

    const [keyword, setKeyword] = useState({
        plateNumber:"",
        plateState:""
     });

    const formatInput = (e) => {

    const value = normalize(e.target.value);
    setKeyword((prev) => ({
        ...prev,
        plateNumber: value
    }));
    };

  const normalize = (keyword) => {
  if (!keyword) return "";

  const cleaned = keyword.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5)
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;

  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}`;
  };

    const handlePlateBlur = () => {
    setKeyword((prev) => ({
      ...prev,
      plateNumber: normalize(prev.plateNumber)
    }));
  };

  const handleStateChange = (e) => {
    setKeyword((prev) => ({
      ...prev,
      plateState: e.target.value.toUpperCase()
    }));
  };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
        const { data, error } = await supabase.functions.invoke(
            "get-vehicle-info",
            {
            body: {
                plate: keyword.plateNumber,
                state: keyword.plateState
            }
            }
        );

        if (error) throw error;

        setVehicleResult(data);
        } catch (err) {
        setError("Failed to fetch vehicle information");
        } finally {
        setLoading(false);
        }
    };

    

    const US_STATES = [
        { code: "AL", name: "Alabama" },
        { code: "AK", name: "Alaska" },
        { code: "AZ", name: "Arizona" },
        { code: "AR", name: "Arkansas" },
        { code: "CA", name: "California" },
        { code: "CO", name: "Colorado" },
        { code: "CT", name: "Connecticut" },
        { code: "DE", name: "Delaware" },
        { code: "FL", name: "Florida" },
        { code: "GA", name: "Georgia" },
        { code: "HI", name: "Hawaii" },
        { code: "ID", name: "Idaho" },
        { code: "IL", name: "Illinois" },
        { code: "IN", name: "Indiana" },
        { code: "IA", name: "Iowa" },
        { code: "KS", name: "Kansas" },
        { code: "KY", name: "Kentucky" },
        { code: "LA", name: "Louisiana" },
        { code: "ME", name: "Maine" },
        { code: "MD", name: "Maryland" },
        { code: "MA", name: "Massachusetts" },
        { code: "MI", name: "Michigan" },
        { code: "MN", name: "Minnesota" },
        { code: "MS", name: "Mississippi" },
        { code: "MO", name: "Missouri" },
        { code: "MT", name: "Montana" },
        { code: "NE", name: "Nebraska" },
        { code: "NV", name: "Nevada" },
        { code: "NH", name: "New Hampshire" },
        { code: "NJ", name: "New Jersey" },
        { code: "NM", name: "New Mexico" },
        { code: "NY", name: "New York" },
        { code: "NC", name: "North Carolina" },
        { code: "ND", name: "North Dakota" },
        { code: "OH", name: "Ohio" },
        { code: "OK", name: "Oklahoma" },
        { code: "OR", name: "Oregon" },
        { code: "PA", name: "Pennsylvania" },
        { code: "RI", name: "Rhode Island" },
        { code: "SC", name: "South Carolina" },
        { code: "SD", name: "South Dakota" },
        { code: "TN", name: "Tennessee" },
        { code: "TX", name: "Texas" },
        { code: "UT", name: "Utah" },
        { code: "VT", name: "Vermont" },
        { code: "VA", name: "Virginia" },
        { code: "WA", name: "Washington" },
        { code: "WV", name: "West Virginia" },
        { code: "WI", name: "Wisconsin" },
        { code: "WY", name: "Wyoming" }
    ];

    return(
        <>
        {vehicleResult ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                <Label>Make</Label>
                <Input value={vehicleResult.make || ""} readOnly />
                </div>
                <div className="space-y-2">
                <Label>Model</Label>
                <Input value={vehicleResult.model || ""} readOnly />
                </div>

                <div className="space-y-2">
                <Label>Year</Label>
                <Input value={vehicleResult.year || ""} readOnly />
                </div>

                <div className="space-y-2">
                <Label>Type</Label>
                <Input value={vehicleResult.type || ""} readOnly />
                </div>

                <div className="space-y-2">
                <Label>VIN</Label>
                <Input value={vehicleResult.vin || ""} readOnly />
                </div>


                <div className="flex items-center space-x-2">
                    <Checkbox
                    id="trackingConsent"
                    checked={vehicleTracking}
                    onCheckedChange={(checked) => setVehicleTracking(checked as boolean )}
                    
                    />
                    <Label htmlFor="trackingConsent" className="text-sm">
                    I agree to location tracking during active deliveries
                    </Label>
                </div>

                <Button variant="hero" onClick={saveVehicle} disabled={!vehicleTracking}>
                    Finish Setup
                </Button>

            </div>
            ) : (<form onSubmit={handleSubmit} className="gap-1 justify-center">

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="plateNumber"> Vehicle Plate Number</Label>
                    <Input
                    id="plateNumber"
                    type="text"
                    placeholder="FL-222-BLB"
                    onBlur={handlePlateBlur}
                    value={keyword.plateNumber}
                    onChange={formatInput}
                    maxLength={10}
                    required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="plateState">Plate Number State</Label>
                    <select
                        id="plateState"
                        value={keyword.plateState}
                        onChange={handleStateChange}
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
                </div>
            </div>

            <Button disabled={loading}>
                {loading ? "Looking up..." : "Lookup Vehicle"}
            </Button>

        

           

        </form> )}
        </>
        
    )
}