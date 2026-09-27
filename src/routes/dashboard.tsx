import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Layers, MapPin, Plus, Ruler, Sprout } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  ConfidenceBar,
  EmptyState,
  ErrorBanner,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Skeleton,
  StatCard,
} from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";
import { getFarmProfile, getLatestReading, getReadings } from "@/services/api";
import { CROP_EMOJI } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SmartFarm AI" },
      {
        name: "description",
        content: "Your farm overview, latest crop recommendation and soil reading stats.",
      },
      { property: "og:title", content: "Dashboard — SmartFarm AI" },
      { property: "og:description", content: "Your latest crop and fertilizer recommendation." },
    ],
  }),
  component: DashboardPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const { user } = useAuth();
  const farm = useQuery({ queryKey: ["farm"], queryFn: getFarmProfile });
  const latest = useQuery({ queryKey: ["latest"], queryFn: getLatestReading });
  const readings = useQuery({ queryKey: ["readings"], queryFn: getReadings });

  const lastReading = latest.data;
  const lastDate = lastReading ? new Date(lastReading.date) : null;
  const isToday = lastDate ? lastDate.toDateString() === new Date().toDateString() : false;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {greeting()}, {user?.name?.split(" ")[0] ?? "Farmer"} 👋
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {farm.isLoading ? "Loading your farm..." : (farm.data?.location ?? "Farm not set up")}
        </p>
      </div>

      <Link to="/new-reading" className="mb-8 block">
        <div className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-[var(--shadow-lift)] transition-transform active:scale-[0.99]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-foreground/15">
            <Plus className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold">New Soil Reading</span>
            <span className="block text-sm opacity-90">
              Enter N, P, K and pH to get a recommendation
            </span>
          </span>
        </div>
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <SectionHeader title="Latest recommendation" />
          {latest.isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : latest.isError ? (
            <ErrorBanner
              message="Couldn't load your latest recommendation."
              onRetry={() => latest.refetch()}
            />
          ) : lastReading ? (
            <Card className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Recommended crop
                  </p>
                  <p className="mt-1 truncate text-2xl font-bold">
                    {CROP_EMOJI[lastReading.crop] ?? "🌱"} {lastReading.crop}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Recommended fertilizer
                  </p>
                  <p className="mt-1 truncate text-2xl font-bold">{lastReading.fertilizer}</p>
                </div>
              </div>
              <ConfidenceBar value={lastReading.crop_confidence} label="Crop confidence" />
              <Link to="/history/$id" params={{ id: String(lastReading.reading_id) }}>
                <SecondaryButton fullWidth>View details</SecondaryButton>
              </Link>
            </Card>
          ) : (
            <EmptyState
              icon={<Sprout className="h-6 w-6" aria-hidden />}
              title="No readings yet"
              description="Create your first soil reading to receive a crop and fertilizer recommendation."
              action={
                <Link to="/new-reading">
                  <PrimaryButton icon={<Plus className="h-5 w-5" aria-hidden />}>
                    New Soil Reading
                  </PrimaryButton>
                </Link>
              }
            />
          )}
        </section>

        <section>
          <SectionHeader title="Quick stats" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StatCard
              label="Total readings"
              value={readings.isLoading ? "—" : String(readings.data?.length ?? 0)}
              icon={<Layers className="h-3.5 w-3.5" aria-hidden />}
            />
            <StatCard
              label="Last checked"
              value={
                lastDate
                  ? isToday
                    ? "Today"
                    : lastDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                  : "—"
              }
              icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />}
            />
            <StatCard
              label="Farm size"
              value={farm.data?.land_size ? `${farm.data.land_size} acres` : "Not set"}
              icon={<Ruler className="h-3.5 w-3.5" aria-hidden />}
            />
            <StatCard
              label="Soil type"
              value={farm.data?.soil_type ?? "Not set"}
              icon={<Sprout className="h-3.5 w-3.5" aria-hidden />}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
