import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  ConfidenceBar,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Skeleton,
  TrustBadge,
} from "@/components/ui-kit";
import { CROP_EMOJI, type Reading } from "@/lib/types";
import { getCachedResult } from "@/services/api";
import { InputSummary } from "@/components/InputSummary";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your recommendation — SmartFarm AI" },
      {
        name: "description",
        content: "Your recommended crop, fertilizer and the reasoning behind it.",
      },
      { property: "og:title", content: "Your recommendation — SmartFarm AI" },
      { property: "og:description", content: "Recommended crop and fertilizer for your soil." },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const navigate = useNavigate();
  const [reading, setReading] = useState<Reading | null | undefined>(undefined);

  useEffect(() => {
    setReading(getCachedResult());
  }, []);

  if (reading === undefined) {
    return (
      <AppShell title="Your Recommendation 🌱">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!reading) {
    return (
      <AppShell title="Your Recommendation 🌱">
        <EmptyState
          title="No recommendation yet"
          description="Create a soil reading to see your crop and fertilizer recommendation."
          action={
            <PrimaryButton onClick={() => navigate({ to: "/new-reading" })}>
              New Soil Reading
            </PrimaryButton>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Your Recommendation 🌱" subtitle="Based on your latest soil reading.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="enter-fade flex flex-col gap-6 bg-primary-soft">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-accent-foreground uppercase">
                Recommended crop
              </p>
              <p className="mt-1 text-4xl font-black break-words text-foreground">
                {CROP_EMOJI[reading.crop] ?? "🌱"} {reading.crop}
              </p>
              <div className="mt-3">
                <ConfidenceBar value={reading.crop_confidence} label="Crop confidence" />
              </div>
            </div>
            <div className="border-t border-border/70 pt-5">
              <p className="text-xs font-semibold tracking-[0.12em] text-accent-foreground uppercase">
                Recommended fertilizer
              </p>
              <p className="mt-1 text-3xl font-black break-words text-foreground">
                {reading.fertilizer}
              </p>
              <div className="mt-3">
                <ConfidenceBar
                  value={reading.fertilizer_confidence}
                  label="Fertilizer confidence"
                />
              </div>
            </div>
          </Card>

          <section>
            <SectionHeader title="Why this recommendation?" />
            <Card>
              <p className="text-base leading-relaxed text-foreground">{reading.explanation}</p>
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <SectionHeader title="Input summary" />
            <InputSummary reading={reading} />
          </section>

          <TrustBadge>Cross-checked against ICAR fertilizer recommendation standards.</TrustBadge>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link to="/dashboard" className="flex-1">
              <PrimaryButton fullWidth icon={<Home className="h-5 w-5" aria-hidden />}>
                Save & back to home
              </PrimaryButton>
            </Link>
            <Link to="/new-reading" className="flex-1">
              <SecondaryButton fullWidth icon={<Plus className="h-5 w-5" aria-hidden />}>
                New reading
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
