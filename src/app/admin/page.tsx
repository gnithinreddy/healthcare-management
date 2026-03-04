"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type OverviewResponse = {
  totalUsers: number;
  patients: number;
  doctors: number;
  pharmacists: number;
  admins: number;
  receptionists: number;
  newSignUpsLast7Days: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  recentPatients: {
    id: string;
    email: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    mrn: string | null;
  }[];
  recentFeedback: {
    id: string;
    message: string;
    createdAt: string;
    userEmail: string;
    userRole: "PATIENT" | "DOCTOR" | "PHARMACIST" | "RECEPTIONIST" | "ADMIN";
  }[];
  recentAppointments: {
    id: string;
    startAt: string;
    status: string;
    patientName: string;
    doctorName: string;
  }[];
  roleDistribution: { role: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/overview");
      if (!res.ok) {
        throw new Error("Failed to load admin overview");
      }
      const json = (await res.json()) as OverviewResponse;
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong loading data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {lastUpdated && !loading && (
            <p className="text-xs text-slate-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={fetchOverview}
          disabled={loading}
          className="rounded-full border border-emerald-500/50 px-4 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats cards - all 6 roles + appointments + sign-ups trend */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <DashboardCard
          title="Total users"
          value={data?.totalUsers ?? 0}
          highlight
          loading={loading}
        />
        <DashboardCard
          title="Patients"
          value={data?.patients ?? 0}
          loading={loading}
        />
        <DashboardCard
          title="Doctors"
          value={data?.doctors ?? 0}
          loading={loading}
        />
        <DashboardCard
          title="Pharmacists"
          value={data?.pharmacists ?? 0}
          loading={loading}
        />
        <DashboardCard
          title="Receptionists"
          value={data?.receptionists ?? 0}
          loading={loading}
        />
        <DashboardCard
          title="Admins"
          value={data?.admins ?? 0}
          loading={loading}
        />
      </section>

      {/* Appointments & Sign-ups trend */}
      <section className="grid gap-3 sm:grid-cols-3">
        <DashboardCard
          title="Appointments today"
          value={data?.appointmentsToday ?? 0}
          loading={loading}
        />
        <DashboardCard
          title="Appointments this week"
          value={data?.appointmentsThisWeek ?? 0}
          loading={loading}
        />
        <div
          className={`rounded-2xl border p-4 bg-slate-950/80 border-emerald-500/20`}
        >
          <p className="text-xs font-medium text-slate-300">
            New sign-ups (last 7 days)
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-200">
            {loading ? (
              <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-700" />
            ) : (
              data?.newSignUpsLast7Days ?? 0
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-1">
        <div className="max-w-xl space-y-3">
          <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-emerald-200">
              System status
            </h2>
            {error ? (
              <p className="mt-2 text-red-400">{error}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Database connection</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Auth endpoints online</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Admin dashboard ready</span>
                </li>
              </ul>
            )}
          </div>

          {/* Recent appointments */}
          <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-emerald-200">
              Upcoming appointments
            </h2>
            <p className="mt-1 text-[0.7rem] text-slate-400">
              Next 5 scheduled appointments.
            </p>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
              {loading && (
                <p className="text-slate-500">Loading appointments...</p>
              )}
              {!loading &&
                (data?.recentAppointments?.length ?? 0) === 0 && (
                  <p className="text-slate-500">No upcoming appointments.</p>
                )}
              {!loading &&
                data?.recentAppointments?.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-emerald-500/20 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-emerald-200">
                        {a.patientName}
                      </span>
                      <span className="text-[0.6rem] text-slate-500">
                        {new Date(a.startAt).toLocaleDateString()}{" "}
                        {new Date(a.startAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[0.7rem] text-slate-300">
                      Dr. {a.doctorName}
                    </p>
                    <span className="mt-1 inline-flex text-[0.6rem] capitalize text-emerald-300">
                      {a.status.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-emerald-200">
              Reports & feedback
            </h2>
            <p className="mt-1 text-[0.7rem] text-slate-400">
              Latest messages submitted by users.
            </p>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
              {loading && (
                <p className="text-slate-500">Loading feedback...</p>
              )}
              {!loading &&
                (data?.recentFeedback?.length ?? 0) === 0 && (
                  <p className="text-slate-500">No feedback or reports yet.</p>
                )}
              {!loading &&
                data?.recentFeedback?.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-emerald-500/20 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[0.65rem] font-medium text-emerald-200">
                        {f.userEmail}
                      </span>
                      <span className="text-[0.6rem] text-slate-500">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-slate-200 line-clamp-3">
                      {f.message}
                    </p>
                    <span className="mt-1 inline-flex text-[0.6rem] capitalize text-emerald-300">
                      {f.userRole.toLowerCase()}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4 text-xs text-slate-200">
            <h2 className="text-sm font-semibold text-emerald-200">
              Quick links
            </h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                <Link
                  href="/admin/users"
                  className="text-emerald-300 hover:underline"
                >
                  Manage all users →
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users?role=PATIENT"
                  className="text-emerald-300 hover:underline"
                >
                  View patients →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

type DashboardCardProps = {
  title: string;
  value: number;
  highlight?: boolean;
  loading?: boolean;
};

function DashboardCard({
  title,
  value,
  highlight,
  loading,
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 bg-slate-950/80 ${
        highlight
          ? "border-emerald-500/40 shadow-lg shadow-emerald-500/25"
          : "border-emerald-500/20"
      }`}
    >
      <p className="text-xs font-medium text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-emerald-200">
        {loading ? (
          <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-700" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}
