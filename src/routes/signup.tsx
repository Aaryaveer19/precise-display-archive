import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/AppShell";
import { ErrorBanner, InputField, PrimaryButton } from "@/components/ui-kit";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — SmartFarm AI" },
      {
        name: "description",
        content: "Create a SmartFarm AI account to start tracking your soil readings.",
      },
      { property: "og:title", content: "Create account — SmartFarm AI" },
      { property: "og:description", content: "Start tracking your soil readings." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter your name";
    if (!/^\d{10}$/.test(form.phone.trim())) next.phone = "Phone number must be 10 digits";
    if (form.password.length < 6) next.password = "Password must be at least 6 characters";
    if (form.confirm !== form.password) next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(form.name.trim(), form.phone.trim(), form.password);
      toast.success("Account created");
      navigate({ to: "/farm-setup" });
    } catch {
      setFormError("Something went wrong while creating your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
        {formError ? <ErrorBanner message={formError} /> : null}
        <InputField
          label="Name"
          autoComplete="name"
          placeholder="Ramesh Patil"
          value={form.name}
          onChange={set("name")}
          error={errors.name}
        />
        <InputField
          label="Phone number"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10 digit mobile number"
          value={form.phone}
          onChange={set("phone")}
          error={errors.phone}
        />
        <InputField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimum 6 characters"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />
        <InputField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
        />
        <PrimaryButton type="submit" fullWidth loading={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </PrimaryButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
