"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Role = "PATIENT" | "DOCTOR" | "PHARMACIST" | "ADMIN";

type UserDetail = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  } | null;
};

type UserDetailResponse = {
  user: UserDetail;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams.get("role") as Role | null;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${params.id}`);
        const json = (await res.json()) as UserDetailResponse;
        if (!res.ok) {
          throw new Error((json as any)?.error ?? "Failed to load user");
        }
        setUser(json.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong loading user",
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [params.id]);

  const effectiveRole = user?.role ?? roleParam ?? "PATIENT";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string | null)?.trim();

    const payload: any = {};
    if (email && email !== user.email) {
      payload.email = email;
    }

    if (effectiveRole === "PATIENT") {
      payload.patient = {
        firstName:
          (form.get("firstName") as string | null)?.trim() ??
          user.patient?.firstName,
        lastName:
          (form.get("lastName") as string | null)?.trim() ??
          user.patient?.lastName,
        dateOfBirth:
          (form.get("dateOfBirth") as string | null) ??
          user.patient?.dateOfBirth,
        gender:
          (form.get("gender") as string | null) ?? user.patient?.gender,
      };
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error ?? "Failed to update user");
      }
      router.push(
        effectiveRole
          ? `/admin/users?role=${effectiveRole}`
          : "/admin/users",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong saving user",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (
      !window.confirm("Are you sure you want to delete this user permanently?")
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error ?? "Failed to delete user");
      }
      router.push(
        effectiveRole
          ? `/admin/users?role=${effectiveRole}`
          : "/admin/users",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong deleting user",
      );
    }
  }

  if (loading) {
    return (
      <div className="text-xs text-slate-400">Loading user information...</div>
    );
  }

  if (!user) {
    return (
      <div className="text-xs text-red-400">
        Unable to load this user. It may have been deleted.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">User details</h1>
          <p className="text-xs text-slate-400">
            {user.email} • {user.role.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(
                effectiveRole
                  ? `/admin/users?role=${effectiveRole}`
                  : "/admin/users",
              )
            }
            className="rounded-full border border-emerald-500/40 px-3 py-1.5 text-[0.75rem] font-medium text-emerald-200 hover:bg-emerald-500/10"
          >
            Back to list
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-red-500/60 px-3 py-1.5 text-[0.75rem] font-medium text-red-300 hover:bg-red-500/10"
          >
            Delete user
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4 text-xs text-slate-200"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-[0.7rem] font-medium text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[0.7rem] font-medium text-slate-200">
              Role
            </label>
            <input
              disabled
              value={user.role.toLowerCase()}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300"
            />
          </div>
        </div>

        {effectiveRole === "PATIENT" && (
          <div className="mt-2 space-y-3">
            <h2 className="text-[0.7rem] font-semibold text-emerald-200">
              Patient profile
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="firstName"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  defaultValue={user.patient?.firstName ?? ""}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="lastName"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  defaultValue={user.patient?.lastName ?? ""}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="dateOfBirth"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Date of birth
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={
                    user.patient
                      ? new Date(
                          user.patient.dateOfBirth as unknown as string,
                        )
                          .toISOString()
                          .slice(0, 10)
                      : ""
                  }
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="gender"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={user.patient?.gender ?? ""}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-[0.7rem] text-red-400">
            {error}
          </p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.8rem] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

