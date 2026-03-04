"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  reason: string | null;
  patientName: string;
  patientMrn: string;
  clinicName: string | null;
};

type DashboardData = {
  doctor: { firstName: string; lastName: string; specialization: string | null; licenseNumber: string | null; consultationFee: number | null };
  clinic: { id: string; name: string; phone: string | null } | null;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
};

export default function DoctorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/doctor/dashboard");
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatStatus = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-300">{error}</p>
        <Link href="/auth" className="mt-4 inline-block text-emerald-300 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { doctor, clinic, todayAppointments, upcomingAppointments } = data;
  const fullName = `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-6 shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{fullName}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {doctor.specialization && `${doctor.specialization} • `}
              {clinic?.name ?? "No clinic assigned"}
              {doctor.consultationFee != null && ` • $${doctor.consultationFee} fee`}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 p-4">
            <span className="text-2xl font-bold text-emerald-200">
              {todayAppointments.length}
            </span>
            <span className="ml-2 text-sm text-slate-300">
              today&apos;s appointment{todayAppointments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Today&apos;s schedule
        </h2>
        {todayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">No appointments scheduled for today.</p>
            <Link
              href="/doctor/appointments"
              className="mt-2 inline-block text-sm text-emerald-300 hover:underline"
            >
              View all appointments
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{a.patientName}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {new Date(a.startAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(a.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • MRN: {a.patientMrn}
                    </p>
                    {a.reason && (
                      <p className="mt-1 text-xs text-slate-500">{a.reason}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                      a.status === "CONFIRMED"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {formatStatus(a.status)}
                  </span>
                </div>
                <Link
                  href={`/doctor/appointments?id=${a.id}`}
                  className="mt-3 inline-block text-xs font-medium text-emerald-300 hover:text-emerald-200"
                >
                  View details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Upcoming
        </h2>
        {upcomingAppointments.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming appointments.</p>
        ) : (
          <div className="space-y-2">
            {upcomingAppointments
              .slice(0, 5)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {a.patientName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.startAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatStatus(a.status)}
                  </span>
                </div>
              ))}
            <Link
              href="/doctor/appointments"
              className="inline-block text-sm text-emerald-300 hover:underline"
            >
              View all
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
