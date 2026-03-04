"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ReceptionistData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  dateOfBirth?: string | null;
  gender?: string;
};


export default function ReceptionistProfilePage() {
  const [data, setData] = useState<ReceptionistData | null>(null);
  const [clinic, setClinic] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/receptionist/dashboard");
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData(json.profile ?? null);
      setClinic(json.clinic ? { name: json.clinic.name } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/receptionist/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          phone: form.get("phone") || null,
          address1: form.get("address1") || null,
          address2: form.get("address2") || null,
          city: form.get("city") || null,
          state: form.get("state") || null,
          zip: form.get("zip") || null,
          dateOfBirth: form.get("dateOfBirth") || null,
          gender: form.get("gender") || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      await loadData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    const form = new FormData(e.currentTarget);
    const currentPassword = form.get("currentPassword") as string;
    const newPassword = form.get("newPassword") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/receptionist/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to update password");
      setPasswordSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-300">{error ?? "No data"}</p>
        <Link href="/auth" className="mt-4 inline-block text-emerald-300 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring";
  const labelClass = "block text-xs font-medium text-slate-300 mb-1";
  const readOnlyClass = "w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-400";

  return (
    <div className="space-y-8 w-full max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          View and update your profile information.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <form onSubmit={handleSubmit} className="contents">
          {saveError && (
            <p className="col-span-full text-sm text-red-400">{saveError}</p>
          )}

          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-200">Personal info</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input name="firstName" type="text" defaultValue={data.firstName} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input name="lastName" type="text" defaultValue={data.lastName} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" type="tel" defaultValue={data.phone} placeholder="+1-555-0123" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of birth</label>
                <input name="dateOfBirth" type="date" defaultValue={data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select name="gender" defaultValue={data.gender ?? ""} className={inputClass}>
                  <option value="">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-200">Account</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Clinic</label>
                <input type="text" value={clinic?.name ?? "—"} disabled className={readOnlyClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={data.email} disabled className={readOnlyClass} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-5 space-y-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-emerald-200">Address</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Street address</label>
                <input name="address1" type="text" defaultValue={data.address1 ?? ""} placeholder="123 Main St" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apt, suite, etc.</label>
                <input name="address2" type="text" defaultValue={data.address2 ?? ""} placeholder="Apt 4" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input name="city" type="text" defaultValue={data.city ?? ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input name="state" type="text" defaultValue={data.state ?? ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input name="zip" type="text" defaultValue={data.zip ?? ""} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-5 space-y-4 sm:col-span-2">
          <h2 className="text-sm font-semibold text-emerald-200">Security</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-emerald-400">Password updated successfully.</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Current password</label>
                <input name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>New password</label>
                <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Confirm new password</label>
                <input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
              </div>
            </div>
            <button type="submit" disabled={passwordSaving} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
