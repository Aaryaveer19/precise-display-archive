import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, Loader2, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  ErrorBanner,
  InputField,
  PrimaryButton,
  SectionHeader,
  SuccessNote,
} from "@/components/ui-kit";
import { FIELD_RANGES, type FieldKey } from "@/lib/types";
import { getFarmProfile, getWeather, predict } from "@/services/api";

export const Route = createFileRoute("/new-reading")({
  head: () => ({
    meta: [
      { title: "New soil reading — SmartFarm AI" },
      {
        name: "description",
        content: "Enter nitrogen, phosphorus, potassium and pH to get a crop recommendation.",
      },
      { property: "og:title", content: "New soil reading — SmartFarm AI" },
      { property: "og:description", content: "Enter your latest soil measurements." },
    ],
  }),
  component: NewReadingPage,
});

type FormState = Record<FieldKey, string>;

const EMPTY: FormState = {
  N: "",
  P: "",
  K: "",
  ph: "",
  temperature: "",
  humidity: "",
  rainfall: "",
};

function fieldError(key: FieldKey, raw: string) {
  if (raw.trim() === "") return "This value is required";
  const num = Number(raw);
  if (Number.isNaN(num)) return "Enter a number";
  if (num < 0) return "Value cannot be negative";
  return null;
}

function fieldWarning(key: FieldKey, raw: string) {
  const num = Number(raw);
  if (raw.trim() === "" || Number.isNaN(num)) return null;
  const { min, max } = FIELD_RANGES[key];
  if (num < min || num > max) return `Outside the expected range ${min}–${max}`;
  return null;
}

function NewReadingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherFilled, setWeatherFilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const farm = useQuery({ queryKey: ["farm"], queryFn: getFarmProfile });
  const locationName = farm.data?.location ?? "your farm";

  const set = (key: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const loadWeather = useCallback(async (name: string) => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const w = await getWeather(name);
      setForm((f) => ({
        ...f,
        temperature: String(w.temperature),
        humidity: String(w.humidity),
        rainfall: String(w.rainfall),
      }));
      setWeatherFilled(true);
    } catch {
      setWeatherError(true);
      setWeatherFilled(false);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farm.isSuccess) loadWeather(farm.data?.location ?? "your farm");
  }, [farm.isSuccess, farm.data?.location, loadWeather]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const next: Partial<Record<FieldKey, string>> = {};
    (Object.keys(FIELD_RANGES) as FieldKey[]).forEach((k) => {
      const err = fieldError(k, form[k]);
      if (err) next[k] = err;
    });
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    try {
      await predict({
        N: Number(form.N),
        P: Number(form.P),
        K: Number(form.K),
        ph: Number(form.ph),
        temperature: Number(form.temperature),
        humidity: Number(form.humidity),
        rainfall: Number(form.rainfall),
      });
      navigate({ to: "/results" });
    } catch {
      setSubmitError(
        "Something went wrong while generating your recommendation. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const numField = (key: FieldKey, extra?: { readOnlyLook?: boolean }) => {
    const r = FIELD_RANGES[key];
    return (
      <InputField
        key={key}
        label={r.unit ? `${r.label} (${r.unit})` : r.label}
        inputMode="decimal"
        placeholder={`${r.min}–${r.max}`}
        value={form[key]}
        onChange={set(key)}
        error={errors[key] ?? null}
        warning={errors[key] ? null : fieldWarning(key, form[key])}
        hint={`Expected range: ${r.min}–${r.max}`}
        className={extra?.readOnlyLook ? "bg-secondary/60" : undefined}
      />
    );
  };

  return (
    <AppShell title="New Soil Reading" subtitle="Enter your latest soil measurements.">
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <section>
            <SectionHeader title="Soil nutrients" />
            <Card className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {numField("N")}
              {numField("P")}
              {numField("K")}
            </Card>
          </section>

          <section>
            <SectionHeader title="Soil condition" />
            <Card className="max-w-xs">{numField("ph")}</Card>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <SectionHeader title="Weather conditions" />
            <Card className="flex flex-col gap-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0 text-sm">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">Weather for {locationName}</span>
                  </p>
                  {weatherLoading ? (
                    <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Fetching weather
                      data...
                    </p>
                  ) : weatherError ? (
                    <p className="mt-1 font-medium text-warning">
                      ⚠ Couldn&apos;t fetch weather data — enter manually
                    </p>
                  ) : weatherFilled ? (
                    <SuccessNote>Auto-filled from weather data</SuccessNote>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => loadWeather(locationName)}
                  disabled={weatherLoading}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-secondary disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${weatherLoading ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  Refresh
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {numField("temperature", { readOnlyLook: true })}
                {numField("humidity", { readOnlyLook: true })}
                {numField("rainfall", { readOnlyLook: true })}
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            {submitError ? <ErrorBanner message={submitError} /> : null}
            <Card className="flex flex-col gap-3 bg-primary-soft">
              <p className="flex items-center gap-2 text-sm text-accent-foreground">
                <CloudSun className="h-4 w-4 shrink-0" aria-hidden />
                We combine your soil values with local weather to suggest the best crop and
                fertilizer.
              </p>
              <PrimaryButton
                type="submit"
                fullWidth
                loading={submitting}
                icon={<Sparkles className="h-5 w-5" aria-hidden />}
              >
                {submitting ? "Analyzing your soil..." : "Get recommendation"}
              </PrimaryButton>
            </Card>
          </section>
        </div>
      </form>
    </AppShell>
  );
}
