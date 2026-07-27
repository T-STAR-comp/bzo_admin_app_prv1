import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/auth-context";

export function LoginPage() {
  const { user, loading, login, verifyCode } = useAuth();
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user?.role === "admin") {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login(username, password);
      setEmail(res.email);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyCode(email, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your admin credentials. A verification code will be sent to the admin email.
        </p>

        {step === "credentials" ? (
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <Field label="Username" value={username} onChange={setUsername} autoComplete="username" />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-signal w-full rounded-xl py-3 text-sm font-semibold">
              {submitting ? "Signing in…" : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-8 space-y-4">
            <p className="rounded-xl bg-signal-soft px-4 py-3 text-sm">
              Code sent to <strong>{email}</strong>. Check server logs if SMTP is unavailable.
            </p>
            <Field label="6-digit code" value={code} onChange={setCode} maxLength={6} inputMode="numeric" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-signal w-full rounded-xl py-3 text-sm font-semibold">
              {submitting ? "Verifying…" : "Verify & enter console"}
            </button>
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full text-sm text-muted-foreground hover:text-ink"
            >
              Back to credentials
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        className="mt-1.5 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:border-signal"
      />
    </label>
  );
}
