import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/pages/StatisticsPage";

export function UserControlPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    role: "user" as "user" | "admin",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          username: form.username || undefined,
          phone: form.phone || undefined,
        }),
      });
      setMessage(`${form.role === "admin" ? "Admin" : "User"} account created successfully.`);
      setForm({ email: "", password: "", firstName: "", lastName: "", username: "", phone: "", role: "user" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="User control"
      subtitle="Create new customer accounts or full admin access accounts. Accounts are email-verified immediately."
    >
      <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl border border-hairline bg-surface-elevated p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <Input label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required className="sm:col-span-2" />
          <Input label="Username (optional)" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <Input label="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required className="sm:col-span-2" />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Account type</legend>
          <div className="mt-3 flex gap-3">
            {(["user", "admin"] as const).map((role) => (
              <label
                key={role}
                className={`flex flex-1 cursor-pointer flex-col rounded-xl border px-4 py-3 ${form.role === role ? "border-signal bg-signal-soft" : "border-hairline"}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={form.role === role}
                  onChange={() => setForm({ ...form, role })}
                  className="sr-only"
                />
                <span className="font-medium capitalize">{role}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {role === "admin" ? "Full console access + API admin routes" : "Customer dashboard only"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {message && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <button type="submit" disabled={loading} className="btn-signal rounded-xl px-6 py-3 text-sm font-semibold">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </PageShell>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm outline-none focus:border-signal"
      />
    </label>
  );
}
