import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, History as HistoryIcon, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  EmptyState,
  ErrorBanner,
  PrimaryButton,
  Skeleton,
} from "@/components/ui-kit";
import { getReadings } from "@/services/api";
import { CROP_EMOJI } from "@/lib/types";

export const Route = createFileRoute("/history/")({
  head: () => ({
    meta: [
      { title: "Prediction history — SmartFarm AI" },
      {
        name: "description",
        content: "Every soil reading you have taken and the recommendation it produced.",
      },
      { property: "og:title", content: "Prediction history — SmartFarm AI" },
      { property: "og:description", content: "Your previous crop recommendations." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const readings = useQuery({ queryKey: ["readings"], queryFn: getReadings });

  return (
    <AppShell title="Prediction History" subtitle="Your previous soil readings, newest first.">
      {readings.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : readings.isError ? (
        <ErrorBanner
          message="Couldn't load your previous readings."
          onRetry={() => readings.refetch()}
        />
      ) : (readings.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-6 w-6" aria-hidden />}
          title="No readings yet"
          description="Your previous recommendations will appear here."
          action={
            <Link to="/new-reading">
              <PrimaryButton icon={<Plus className="h-5 w-5" aria-hidden />}>
                Create new reading
              </PrimaryButton>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3 md:grid md:grid-cols-2">
          {readings.data!.map((r) => (
            <li key={r.reading_id}>
              <Link
                to="/history/$id"
                params={{ id: String(r.reading_id) }}
                className="card-surface grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="truncate text-base font-bold">
                    {CROP_EMOJI[r.crop] ?? "🌱"} {r.crop}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{r.fertilizer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-sm font-semibold text-accent-foreground">
                    {Math.round(r.crop_confidence * 100)}%
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
