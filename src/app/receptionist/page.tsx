"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatStatus } from "@/lib/utils";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  reason: string | null;
  checkedInAt?: string | null;
  patientName: string;
  patientMrn: string;
  doctorName: string;
  clinicName: string | null;
};

type CallNextInfo = {
  doctorId: string;
  doctorName: string;
  requestedAt: string;
  nextPatient: { id: string; name: string; mrn: string } | null;
};

type DashboardData = {
  receptionist: { firstName: string; lastName: string };
  clinic: { id: string; name: string; phone: string | null };
  todayAppointments: (Appointment & { checkedInAt?: string | null })[];
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  stats: {
    todayCount: number;
    pendingCount: number;
    noShowsThisWeek: number;
    patientsSeenThisWeek: number;
    sameDayRequests: number;
  };
  clinicInfo: {
    name: string;
    phone: string | null;
    address1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  doctors: { id: string; name: string; specialization: string | null }[];
  callNextInfo: CallNextInfo[];
};

export default function ReceptionistDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [availability, setAvailability] = useState<
    {
      doctorId: string;
      doctorName: string;
      department: string | null;
      booked: number;
      limit: number;
      available: number;
    }[]
  >([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const router = useRouter();

  async function loadAvailability() {
    try {
      const res = await fetch("/api/receptionist/doctors/availability");
      const json = await res.json();
      setAvailability(json.availability ?? []);
      setTotalAvailable(json.totalAvailable ?? 0);
    } catch {
      setAvailability([]);
      setTotalAvailable(0);
    }
  }

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

  async function handleCheckIn(id: string) {
    setCheckingInId(id);
    try {
      const res = await fetch(`/api/receptionist/appointments/${id}/check-in`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to check in");
      await loadData();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setCheckingInId(null);
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
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-300">{error}</p>
        <Link href="/auth" className="mt-4 inline-block text-emerald-300 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { receptionist, clinic, todayAppointments, upcomingAppointments, stats, clinicInfo, doctors, callNextInfo = [] } = data;
  const fullName = `${receptionist.firstName} ${receptionist.lastName}`.trim();

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
      {/* Doctor ready for next patient */}
      {callNextInfo.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <h3 className="text-sm font-semibold text-emerald-200">Send next patient</h3>
          <div className="mt-2 space-y-2">
            {callNextInfo.map((c) => (
              <p key={c.doctorId} className="text-sm text-emerald-100">
                <strong>{c.doctorName}</strong> is ready —{" "}
                {c.nextPatient ? (
                  <>
                    send in <strong>{c.nextPatient.name}</strong> (MRN: {c.nextPatient.mrn})
                  </>
                ) : (
                  "no patient in queue"
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {(stats.pendingCount > 0 || stats.sameDayRequests > 0) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h3 className="text-sm font-semibold text-amber-200">Attention needed</h3>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {stats.pendingCount > 0 && (
              <Link
                href="/receptionist/appointments?status=REQUESTED"
                className="text-amber-300 hover:underline"
              >
                {stats.pendingCount} pending confirmation{stats.pendingCount !== 1 ? "s" : ""}
              </Link>
            )}
            {stats.sameDayRequests > 0 && (
              <span className="text-amber-300">
                {stats.sameDayRequests} same-day request{stats.sameDayRequests !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Today</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">{stats.todayCount}</p>
          <p className="text-xs text-slate-500">appointments</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">{stats.pendingCount}</p>
          <p className="text-xs text-slate-500">awaiting confirm</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">No-shows (week)</p>
          <p className="mt-1 text-2xl font-bold text-red-200">{stats.noShowsThisWeek}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Patients seen (week)</p>
          <p className="mt-1 text-2xl font-bold text-slate-200">{stats.patientsSeenThisWeek}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-6 shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{fullName}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {clinic.name}
              {clinic.phone && ` • ${clinic.phone}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/receptionist/appointments?book=1"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Book appointment
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowAvailability(true);
                loadAvailability();
              }}
              className="rounded-full border border-emerald-500/50 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/10"
            >
              View availability
            </button>
          </div>
        </div>
      </div>

      {/* Clinic info */}
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4">
        <h3 className="text-sm font-semibold text-emerald-200">Clinic info</h3>
        <div className="mt-2 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <div>
            <p className="font-medium text-white">{clinicInfo.name}</p>
            {clinicInfo.phone && <p>{clinicInfo.phone}</p>}
            {(clinicInfo.address1 || clinicInfo.city) && (
              <p className="text-slate-500">
                {[clinicInfo.address1, clinicInfo.city, clinicInfo.state, clinicInfo.zip]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
          <div>
            <p className="font-medium text-slate-400">Doctors ({doctors.length})</p>
            <p className="text-xs text-slate-500">
              {doctors.slice(0, 3).map((d) => d.name).join(", ")}
              {doctors.length > 3 && ` +${doctors.length - 3} more`}
            </p>
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
              href="/receptionist/appointments"
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
                      • {a.doctorName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      MRN: {a.patientMrn} • ID: {a.id.slice(-8)}
                      {a.reason && ` • ${a.reason}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                        a.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {formatStatus(a.status)}
                    </span>
                    {a.status === "CONFIRMED" && (
                      a.checkedInAt ? (
                        <span className="rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-200">
                          Checked in
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCheckIn(a.id)}
                          disabled={checkingInId === a.id}
                          className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {checkingInId === a.id ? "Checking in..." : "Check in"}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <Link
                  href="/receptionist/appointments"
                  className="mt-3 inline-block text-xs font-medium text-emerald-300 hover:text-emerald-200"
                >
                  View all appointments →
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
            {upcomingAppointments.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {a.patientName} – {a.doctorName}
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
              href="/receptionist/appointments"
              className="inline-block text-sm text-emerald-300 hover:underline"
            >
              View all
            </Link>
          </div>
        )}
      </section>

      {/* Availability modal */}
      {showAvailability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Doctor availability</h2>
              <button
                type="button"
                onClick={() => setShowAvailability(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            {availability.length === 0 ? (
              <p className="text-sm text-slate-500">No doctors in your clinic.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-emerald-200">
                  {totalAvailable} appointment slot{totalAvailable !== 1 ? "s" : ""} available across all doctors
                </p>
                {availability.map((a) => (
                  <div
                    key={a.doctorId}
                    className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4"
                  >
                    <p className="font-medium text-emerald-200">
                      {a.doctorName}
                      {a.department && (
                        <span className="ml-2 text-slate-400 font-normal">({a.department})</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {a.available} of {a.limit} slots available
                      {a.booked > 0 && ` (${a.booked} booked)`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
