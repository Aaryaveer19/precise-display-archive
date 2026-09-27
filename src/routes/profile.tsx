import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  ErrorBanner,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Skeleton,
  SelectField,
} from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";
import { SOIL_TYPES } from "@/lib/types";
import { getFarmProfile, saveFarmProfile, updateUser } from "@/services/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SmartFarm AI" },
      {
        name: "description",
        content: "Update your name, phone number and farm details in SmartFarm AI.",
      },
      { property: "og:title", content: "Profile — SmartFarm AI" },
      { property: "og:description", content: "Manage your farmer and farm details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const farm = useQuery({ queryKey: ["farm"], queryFn: getFarmProfile });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [landSize, setLandSize] = useState("");
  const [soilType, setSoilType] = useState("Not sure");
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    if (farm.data) {
      setLocation(farm.data.location);
      setLandSize(farm.data.land_size);
      setSoilType(farm.data.soil_type || "Not sure");
    }
  }, [farm.data]);

  const onSave = async () => {
    if (!/^\d{10}$/.test(phone.trim())) {
      setPhoneError("Phone number must be 10 digits");
      return;
    }
    setPhoneError(null);
    setSaving(true);
    try {
      const updated = await updateUser({ name: name.trim(), phone: phone.trim() });
      setUser(updated);
      await saveFarmProfile({
        user_id: updated.user_id,
        location: location.trim() || "Not set",
        latitude: farm.data?.latitude ?? 19.076,
        longitude: farm.data?.longitude ?? 72.8777,
        land_size: landSize.trim(),
        soil_type: soilType,
      });
      await farm.refetch();
      toast.success("Changes saved");
    } catch {
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Profile" subtitle="Your details and farm information.">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section>
          <SectionHeader title="Your details" />
          <Card className="flex flex-col gap-1">
            <InputField label="Farmer name" value={name} onChange={(e) => setName(e.target.value)} />
            <InputField
              label="Phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phoneError}
            />
            <InputField
              label="Farm location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <InputField
              label="Land size"
              inputMode="decimal"
              suffix="acres"
              value={landSize}
              onChange={(e) => setLandSize(e.target.value)}
            />
            <SelectField
              label="Soil type"
              options={SOIL_TYPES}
              value={soilType}
              onChange={setSoilType}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton fullWidth loading={saving} onClick={onSave}>
                {saving ? "Saving..." : "Save changes"}
              </PrimaryButton>
              <SecondaryButton
                fullWidth
                onClick={logout}
                icon={<LogOut className="h-5 w-5" aria-hidden />}
              >
                Log out
              </SecondaryButton>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="Farm information" />
          {farm.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : farm.isError ? (
            <ErrorBanner message="Couldn't load your farm profile." onRetry={() => farm.refetch()} />
          ) : (
            <Card className="p-0">
              <dl className="divide-y divide-border">
                {[
                  ["Location", farm.data?.location ?? "Not set"],
                  ["Land size", farm.data?.land_size ? `${farm.data.land_size} acres` : "Not set"],
                  ["Soil type", farm.data?.soil_type ?? "Not set"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <dt className="min-w-0 truncate text-sm text-muted-foreground">{k}</dt>
                    <dd className="shrink-0 text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
