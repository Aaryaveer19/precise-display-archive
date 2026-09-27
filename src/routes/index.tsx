import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartFarm AI — Smarter soil, better harvests" },
      {
        name: "description",
        content:
          "Enter your soil readings and get an instant crop and fertilizer recommendation with plain-language reasoning.",
      },
      { property: "og:title", content: "SmartFarm AI" },
      {
        property: "og:description",
        content: "Instant crop and fertilizer recommendations from your soil readings.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const { ready, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      navigate({ to: isAuthenticated ? "/dashboard" : "/login" });
    }, 1000);
    return () => clearTimeout(t);
  }, [ready, isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-[var(--shadow-lift)]">
        <Leaf className="h-10 w-10" aria-hidden />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">SmartFarm AI</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Soil fertility, crop and fertilizer guidance for your farm.
      </p>
      <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
