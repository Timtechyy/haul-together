import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Checkbox } from "@/components/ui/checkbox";
import { US_STATES } from "@/contants/states";

interface PlateData {
  Id: string;
  state: string;
}
interface Details {
  userId: string;
  onComplete: () => void;
}
export default function LicensePlate({ userId, onComplete }: Details) {
  const [vehicleResult, setVehicleResult] = useState(null);
  const [vehicleTracking, setVehicleTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveVehicle = async () => {
    await supabase.from("driver_vehicles").upsert(
      {
        user_id: userId,
        vehicle_type: vehicleResult.style,
        make: vehicleResult.make,
        model: vehicleResult.model,
        year: parseInt(vehicleResult.year),
        color: vehicleResult.color.name,
        trim: vehicleResult.trim,
        license_plate: keyword.plateNumber,
        tracking_consent: vehicleTracking,
      },
      {
        onConflict: "user_id",
      },
    );

    onComplete();
  };

  const [keyword, setKeyword] = useState({
    plateNumber: "",
    plateState: "",
  });

  const formatInput = (e) => {
    const value = normalize(e.target.value);
    setKeyword((prev) => ({
      ...prev,
      plateNumber: value,
    }));
  };

  const normalize = (keyword) => {
    if (!keyword) return "";

    const cleaned = keyword.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;

    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handlePlateBlur = () => {
    setKeyword((prev) => ({
      ...prev,
      plateNumber: normalize(prev.plateNumber),
    }));
  };

  const handleStateChange = (e) => {
    setKeyword((prev) => ({
      ...prev,
      plateState: e.target.value.toUpperCase(),
    }));
    console.log(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("get-vehicle-info", {
        body: {
          plate: {
            id: keyword.plateNumber,
            state: keyword.plateState,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) {
        setError(data.error);
        return;
      }

      setVehicleResult(data);
    } catch (err) {
      setError(err.message || "Failed to fetch vehicle information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {vehicleResult ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={vehicleResult.name || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input id="make" value={vehicleResult.make || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={vehicleResult.model || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trim">Trim</Label>
            <Input id="trim" value={vehicleResult.trim || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" value={vehicleResult.year || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={vehicleResult.color.name || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input id="type" value={vehicleResult.style || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driveType">Drive Type</Label>
            <Input id="driveType" value={vehicleResult.driveType || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transmission">Transmission</Label>
            <Input id="transmission" value={vehicleResult.transmission || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="engine">Engine</Label>
            <Input id="engine" value={vehicleResult.engine || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuel">Fuel</Label>
            <Input id="fuel" value={vehicleResult.fuel || ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label>VIN</Label>
            <Input value={vehicleResult.vin || ""} readOnly />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trackingConsent"
              checked={vehicleTracking}
              onCheckedChange={(checked) => setVehicleTracking(checked as boolean)}
            />
            <Label htmlFor="trackingConsent" className="text-sm">
              I agree to location tracking during active deliveries
            </Label>
          </div>

          <Button variant="hero" onClick={saveVehicle} disabled={!vehicleTracking}>
            Finish Setup
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="gap-1 justify-between gap-y-2">
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

          <div className="justify-center mt-4 flex">
            <Button disabled={loading} className="flex justify-center place-items-center">
              {loading ? "Looking up..." : "Lookup Vehicle"}
            </Button>
          </div>
        </form>
      )}

      {error && <div className="mt-2 rounded-md border border-red-500 px-3 py-2 text-sm text-red-600">{error}</div>}
    </>
  );
}
