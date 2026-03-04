"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DashboardData = {
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  upcomingAppointments: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    reason: string | null;
    checkedInAt: string | null;
    doctorName: string;
    clinicName: string | null;
  }[];
  pastAppointments: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    reason: string | null;
    doctorName: string;
    clinicName: string | null;
  }[];
  prescriptions: {
    id: string;
    status: string;
    createdAt: string;
    doctorName: string;
    items: {
      drugName: string;
      dosage: string | null;
      frequency: string | null;
      instructions: string | null;
    }[];
  }[];
};

export default function PatientDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/patient/dashboard");
      const json = await res.json();

      if (res.status === 401) {
        router.push("/auth");
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to load dashboard");
      }

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

  function isToday(startAt: string) {
    const d = new Date(startAt);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }

  async function handleCheckIn(id: string) {
    setCheckingInId(id);
    try {
      const res = await fetch(`/api/patient/appointments/${id}/check-in`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to check in");
      await loadData();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCheckingInId(null);
    }
  }

  async function handleCancelAppointment(id: string) {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    setCancellingId(id);
    try {
      const res = await fetch(`/api/patient/appointments/${id}/cancel`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to cancel");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-300">{error}</p>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Go to login
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { patient, upcomingAppointments, pastAppointments, prescriptions } =
    data;
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();

  return (
    <div className="space-y-8">
      {checkInError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="select-text flex-1 text-sm text-red-200" tabIndex={0}>
              {checkInError}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(checkInError)}
                className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setCheckInError(null)}
                className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Welcome card */}
      <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-6 shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {fullName || "Patient"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              MRN: {patient.mrn}
              {patient.email && ` • ${patient.email}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/patient/appointments?book=1"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Book appointment
            </Link>
            <div className="flex items-center justify-center rounded-2xl bg-emerald-500/20 px-4 py-2">
              <span className="text-2xl font-bold text-emerald-200">
                {upcomingAppointments.length}
              </span>
              <span className="ml-2 text-sm text-slate-300">
                upcoming
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming appointments */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Upcoming appointments
        </h2>
        <div className="space-y-3">
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">
                No upcoming appointments scheduled.
              </p>
              <Link
                href="/patient/appointments?book=1"
                className="mt-3 inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Book appointment
              </Link>
              <p className="mt-2 text-xs text-slate-500">
                Or contact your clinic receptionist.
              </p>
            </div>
          ) : (
            upcomingAppointments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4 transition-colors hover:border-emerald-500/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      Dr. {a.doctorName}
                      {a.clinicName && (
                        <span className="text-slate-400">
                          {" "}@ {a.clinicName}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {new Date(a.startAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(a.startAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(a.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {a.reason && (
                      <p className="mt-1 text-xs text-slate-500">{a.reason}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">Appointment ID: {a.id.slice(-8)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.status === "CONFIRMED" && isToday(a.startAt) && (
                      a.checkedInAt ? (
                        <span className="rounded-full bg-emerald-500/30 px-3 py-1 text-[0.65rem] font-medium text-emerald-200">
                          Checked in
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCheckIn(a.id)}
                          disabled={checkingInId === a.id}
                          className="rounded-full bg-emerald-500 px-3 py-1 text-[0.7rem] font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {checkingInId === a.id ? "Checking in..." : "Check in"}
                        </button>
                      )
                    )}
                    <span
                      className={`inline-flex rounded-full px-3 py-0.5 text-[0.7rem] font-medium ${
                        a.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : a.status === "REQUESTED"
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-slate-600/50 text-slate-300"
                      }`}
                    >
                      {a.status
                        .toLowerCase()
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelAppointment(a.id)}
                      disabled={cancellingId === a.id}
                      className="rounded-full border border-red-500/50 px-3 py-1 text-[0.7rem] font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {cancellingId === a.id ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Past appointments */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Past appointments
        </h2>
        <div className="space-y-2">
          {pastAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">No past appointments.</p>
          ) : (
            pastAppointments.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Dr. {a.doctorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(a.startAt).toLocaleDateString()} •{" "}
                    {a.status
                      .toLowerCase()
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                </div>
                <span className="text-[0.65rem] text-slate-500">
                  {a.clinicName ?? "—"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Prescriptions */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Prescriptions
        </h2>
        <div className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-6 text-center">
              <p className="text-slate-400">No prescriptions on file.</p>
            </div>
          ) : (
            prescriptions.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    Dr. {p.doctorName}
                  </p>
                  <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[0.65rem] text-slate-300">
                    {p.status
                      .toLowerCase()
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                </p>
                <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                  {p.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-300">
                      <span className="font-medium">{item.drugName}</span>
                      {item.dosage && ` • ${item.dosage}`}
                      {item.frequency && ` • ${item.frequency}`}
                      {item.instructions && (
                        <span className="block mt-0.5 text-xs text-slate-500">
                          {item.instructions}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
