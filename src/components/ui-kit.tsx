import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Buttons ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
};

const base =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export function PrimaryButton({
  loading,
  fullWidth,
  icon,
  children,
  className,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        base,
        "bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:bg-primary/90",
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function SecondaryButton({
  loading,
  fullWidth,
  icon,
  children,
  className,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        base,
        "border border-border bg-card text-foreground hover:bg-secondary",
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* ---------- Inputs ---------- */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string | undefined;
  error?: string | null | undefined;
  warning?: string | null | undefined;
  suffix?: string | undefined;
};

export function InputField({
  label,
  hint,
  error,
  warning,
  suffix,
  id,
  className,
  ...rest
}: InputProps) {
  const inputId = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={`${inputId}-msg`}
          className={cn(
            "min-h-[48px] w-full rounded-xl border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground",
            suffix && "pr-14",
            error ? "border-destructive" : warning ? "border-warning" : "border-input",
            className,
          )}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      <p id={`${inputId}-msg`} className="mt-1.5 min-h-[1.1rem] text-xs">
        {error ? (
          <span className="flex items-center gap-1 font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {error}
          </span>
        ) : warning ? (
          <span className="flex items-center gap-1 font-medium text-warning">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {warning}
          </span>
        ) : (
          <span className="text-muted-foreground">{hint}</span>
        )}
      </p>
    </div>
  );
}

export function SelectField({
  label,
  options,
  id,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  id?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const selectId = id ?? `s-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="w-full">
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Layout bits ---------- */

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <h2 className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card-surface p-5", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card-surface flex min-w-0 flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="truncate text-xl font-bold text-foreground">{value}</span>
    </div>
  );
}

export function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "High" : pct >= 70 ? "Good" : "Moderate";
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label ?? "Confidence"}</span>
        <span className="text-sm font-semibold text-foreground">
          {pct}% · {tone} confidence
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Confidence"}
        className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TrustBadge({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-primary-soft px-4 py-3 text-sm text-accent-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p>{message}</p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className="mt-1 min-h-[32px] font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-success">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function Loader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm">{text ?? "Loading..."}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-secondary", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
