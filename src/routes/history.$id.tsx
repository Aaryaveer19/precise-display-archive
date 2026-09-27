import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  ConfidenceBar,
  EmptyState,
  ErrorBanner,
  SecondaryButton,
  SectionHeader,
  Skeleton,
} from "@/components/ui-kit";
import { InputSummary } from "@/components/InputSummary";
import { getReading } from "@/services/api";
import { CROP_EMOJI } from "@/lib/types";

export const Route = createFileRoute("/history/$id")({
  head: () => ({
    meta: [
      { title: "Reading details — SmartFarm AI" },
      {
        name: "description",
        content: "Full details of a past soil reading and its crop recommendation.",
      },
      { property: "og:title", content: "Reading details — SmartFarm AI" },
      { property: "og:description", content: "Soil data, weather data and recommendation." },
    ],
  }),
  component: ReadingDetailPage,
});

function ReadingDetailPage() {
  const { id } = Route.useParams();
  const reading = useQuery({
    queryKey: ["reading", id],
    queryFn: () => getReading(Number(id)),
  });

  return (
    <AppShell title="Reading Details">
      <Link to="/history" className="mb-4 inline-block">
        <SecondaryButton icon={<ArrowLeft className="h-5 w-5" aria-hidden />}>
          Back to history
        </SecondaryButton>
      </Link>

      {reading.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : reading.isError ? (
        <ErrorBanner message="Couldn't load this reading." onRetry={() => reading.refetch()} />
      ) : !reading.data ? (
        <EmptyState
          title="Reading not found"
          description="This reading may have been removed. Go back to your history to pick another one."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                {new Date(reading.data.date).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Recommended crop
                </p>
                <p className="mt-1 text-3xl font-black break-words">
                  {CROP_EMOJI[reading.data.crop] ?? "🌱"} {reading.data.crop}
                </p>
                <div className="mt-3">
                  <ConfidenceBar value={reading.data.crop_confidence} label="Crop confidence" />
                </div>
              </div>
              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Recommended fertilizer
                </p>
                <p className="mt-1 text-2xl font-black break-words">{reading.data.fertilizer}</p>
                <div className="mt-3">
                  <ConfidenceBar
                    value={reading.data.fertilizer_confidence}
                    label="Fertilizer confidence"
                  />
                </div>
              </div>
            </Card>

            <section>
              <SectionHeader title="Why this recommendation?" />
              <Card>
                <p className="text-base leading-relaxed">{reading.data.explanation}</p>
              </Card>
            </section>
          </div>

          <section>
            <SectionHeader title="Soil & weather data" />
            <InputSummary reading={reading.data} />
          </section>
        </div>
      )}
    </AppShell>
  );
}
