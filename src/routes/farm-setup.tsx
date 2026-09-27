import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, useRequireAuth } from "@/components/AppShell";
import {
  InputField,
  Loader,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  SuccessNote,
} from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";
import { SOIL_TYPES } from "@/lib/types";
import { saveFarmProfile } from "@/services/api";
import { delay } from "@/services/storage";

export const Route = createFileRoute("/farm-setup")({
  head: () => ({
    meta: [
      { title: "Set up your farm — SmartFarm AI" },
      {
        name: "description",
        content: "Save your farm location, land size and soil type to get local recommendations.",
      },
      { property: "og:title", content: "Set up your farm — SmartFarm AI" },
      { property: "og:description", content: "Save your farm location and soil details." },
    ],
  }),
  component: FarmSetupPage,
});

function FarmSetupPage() {
  const allowed = useRequireAuth();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [pincode, setPincode] = useState("");
  const [location, setLocation] = useState<{ name: string; lat: number; lon: number } | null>(
    null,
  );
  const [landSize, setLandSize] = useState("");
  const [soilType, setSoilType] = useState<string>("Not sure");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) return <Loader text="Checking your session..." />;

  const detectLocation = async () => {
    setDetecting(true);
    await delay(1200);
    setLocation({ name: "Mumbai, Maharashtra", lat: 19.076, lon: 72.8777 });
    setPincode("400001");
    setDetecting(false);
    toast.success("Location detected");
  };

  const onSave = async () => {
    if (!location && !/^\d{6}$/.test(pincode.trim())) {
      setError("Enter a 6 digit pincode or use your current location");
      return;
    }
    setError(null);
    setSaving(true);
    const resolved = location ?? {
      name: `Pincode ${pincode.trim()}`,
      lat: 19.076,
      lon: 72.8777,
    };
    await saveFarmProfile({
      user_id: user?.user_id ?? "u_1",
      location: resolved.name,
      latitude: resolved.lat,
      longitude: resolved.lon,
      land_size: landSize.trim(),
      soil_type: soilType,
    });
    if (user) setUser({ ...user, has_farm_profile: true });
    setSaving(false);
    toast.success("Farm saved");
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthLayout title="Set up your farm" subtitle="We use this to fetch your local weather">
      <div className="flex flex-col gap-4">
        <InputField
          label="Pincode"
          inputMode="numeric"
          placeholder="6 digit pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          error={error}
          hint="Used to find weather for your area"
        />

        <SecondaryButton
          type="button"
          fullWidth
          loading={detecting}
          onClick={detectLocation}
          icon={<Crosshair className="h-5 w-5" aria-hidden />}
        >
          {detecting ? "Detecting location..." : "Use my current location"}
        </SecondaryButton>

        {location ? (
          <SuccessNote>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden /> {location.name}
            </span>
          </SuccessNote>
        ) : null}

        <InputField
          label="Land size (optional)"
          inputMode="decimal"
          placeholder="4.5"
          suffix="acres"
          value={landSize}
          onChange={(e) => setLandSize(e.target.value)}
        />

        <SelectField
          label="Soil type (optional)"
          options={SOIL_TYPES}
          value={soilType}
          onChange={setSoilType}
        />

        <PrimaryButton fullWidth loading={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save & continue"}
        </PrimaryButton>
      </div>
    </AuthLayout>
  );
}
