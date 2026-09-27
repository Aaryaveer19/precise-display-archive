import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { History, Home, Leaf, PlusCircle, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui-kit";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/new-reading", label: "New Reading", icon: PlusCircle },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function useRequireAuth() {
  const { ready, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/login" });
  }, [ready, isAuthenticated, navigate]);
  return ready && isAuthenticated;
}

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const allowed = useRequireAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!allowed) return <Loader text="Checking your session..." />;

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <span className="truncate text-base font-bold">SmartFarm AI</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                isActive(item.to)
                  ? "bg-primary-soft text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate text-sm font-bold">SmartFarm AI</span>
          </div>
        </header>

        <main className="enter-fade mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pb-12">
          {title ? (
            <div className="mb-5">
              <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card pt-1.5 lg:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-[52px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
              isActive(item.to) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="enter-fade w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Leaf className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="card-surface p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
