import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/AppShell";
import { ErrorBanner, InputField, PrimaryButton } from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — SmartFarm AI" },
      { name: "description", content: "Log in to SmartFarm AI to view your soil readings." },
      { property: "og:title", content: "Log in — SmartFarm AI" },
      { property: "og:description", content: "Log in to view your soil readings." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    const value = identifier.trim();
    const isEmail = value.includes("@");
    if (!value) next.identifier = "Enter your phone number or email";
    else if (isEmail && !/^\S+@\S+\.\S+$/.test(value)) next.identifier = "Enter a valid email";
    else if (!isEmail && !/^\d{10}$/.test(value))
      next.identifier = "Phone number must be 10 digits";
    if (password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate({ to: user.has_farm_profile ? "/dashboard" : "/farm-setup" });
    } catch {
      setFormError("We couldn't log you in. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to SmartFarm AI">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
        {formError ? <ErrorBanner message={formError} /> : null}
        <InputField
          label="Phone number or Email"
          inputMode="text"
          autoComplete="username"
          placeholder="9876543210"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
        />
        <InputField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <PrimaryButton type="submit" fullWidth loading={loading}>
          {loading ? "Logging in..." : "Log in"}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => toast("Password reset will be available soon.")}
          className="mx-auto mt-3 min-h-[44px] text-sm font-medium text-primary underline underline-offset-4"
        >
          Forgot password?
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-semibold text-primary underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
