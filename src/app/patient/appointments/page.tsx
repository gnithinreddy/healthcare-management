"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatStatus } from "@/lib/utils";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  reason: string | null;
  checkedInAt: string | null;
  doctorName: string;
  clinicName: string | null;
};

type DashboardData = {
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
};

type Option = { id: string; label: string };

export default function PatientAppointmentsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showBook, setShowBook] = useState(false);
  const [doctors, setDoctors] = useState<Option[]>([]);
  const [clinics, setClinics] = useState<Option[]>([]);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorSearchOpen, setDoctorSearchOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [clinicSearchOpen, setClinicSearchOpen] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("book") === "1") {
      setShowBook(true);
      setBookError(null);
      setSelectedDoctorId("");
      setSelectedClinicId("");
      setDoctorSearch("");
      setClinicSearch("");
      loadOptions();
      router.replace("/patient/appointments");
    }
  }, [searchParams, router, loadOptions]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/patient/dashboard");
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData({
        upcomingAppointments: json.upcomingAppointments ?? [],
        pastAppointments: json.pastAppointments ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/appointments");
      if (!res.ok) throw new Error("Failed to load options");
      const json = await res.json();
      setDoctors(json.doctors ?? []);
      setClinics(json.clinics ?? []);
    } catch {
      setDoctors([]);
      setClinics([]);
    }
  }, []);

  async function handleBook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBookError(null);
    const form = new FormData(e.currentTarget);
    const doctorId = form.get("doctorId") as string;
    const clinicId = form.get("clinicId") as string | null;
    const dateStr = form.get("date") as string;
    const timeStr = form.get("time") as string;
    const reason = (form.get("reason") as string) || undefined;

    if (!doctorId || !dateStr || !timeStr) {
      setBookError("Doctor, date, and time are required.");
      return;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    const startAt = new Date(year, month - 1, day, hour, minute);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000); // 30 min slot

    setBooking(true);
    try {
      const res = await fetch("/api/patient/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          clinicId: clinicId || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to book");
      setShowBook(false);
      setSelectedDoctorId("");
      setSelectedClinicId("");
      setDoctorSearch("");
      setClinicSearch("");
      (e.target as HTMLFormElement).reset();
      await loadData();
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBooking(false);
    }
  }

  function isToday(appt: Appointment) {
    const now = new Date();
    const d = new Date(appt.startAt);
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

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this appointment?")) return;
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
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-300">{error}</p>
        <Link href="/auth" className="mt-4 inline-block text-emerald-300 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { upcomingAppointments, pastAppointments } = data;

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Appointments</h1>
          <p className="mt-1 text-sm text-slate-400">
            View and manage your appointments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
      setShowBook(true);
      setBookError(null);
      setSelectedDoctorId("");
      setSelectedClinicId("");
      setDoctorSearch("");
      setClinicSearch("");
      loadOptions();
          }}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Book appointment
        </button>
      </div>

      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Book appointment</h2>
              <button
                type="button"
                onClick={() => setShowBook(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleBook} className="space-y-4">
              {bookError && (
                <p className="text-sm text-red-400">{bookError}</p>
              )}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-300 mb-1">Doctor</label>
                <input
                  type="text"
                  value={selectedDoctorId ? doctors.find((d) => d.id === selectedDoctorId)?.label ?? doctorSearch : doctorSearch}
                  onChange={(e) => {
                    setDoctorSearch(e.target.value);
                    if (selectedDoctorId) setSelectedDoctorId("");
                    setDoctorSearchOpen(true);
                  }}
                  onFocus={() => setDoctorSearchOpen(true)}
                  onBlur={() => setTimeout(() => setDoctorSearchOpen(false), 150)}
                  placeholder="Search doctor by name..."
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-emerald-500/40 focus:ring"
                />
                <input type="hidden" name="doctorId" value={selectedDoctorId} />
                {doctorSearchOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-emerald-500/40 bg-slate-900 py-1 shadow-xl">
                    {(doctorSearch ? doctors.filter((d) => d.label.toLowerCase().includes(doctorSearch.toLowerCase())) : doctors).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedDoctorId(d.id);
                          setDoctorSearch("");
                          setDoctorSearchOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-emerald-500/20"
                      >
                        {d.label}
                      </button>
                    ))}
                    {(doctorSearch ? doctors.filter((d) => d.label.toLowerCase().includes(doctorSearch.toLowerCase())) : doctors).length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-500">No doctors found</p>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-slate-300 mb-1">Clinic (optional)</label>
                <input
                  type="text"
                  value={selectedClinicId ? clinics.find((c) => c.id === selectedClinicId)?.label ?? clinicSearch : clinicSearch}
                  onChange={(e) => {
                    setClinicSearch(e.target.value);
                    if (selectedClinicId) setSelectedClinicId("");
                    setClinicSearchOpen(true);
                  }}
                  onFocus={() => setClinicSearchOpen(true)}
                  onBlur={() => setTimeout(() => setClinicSearchOpen(false), 150)}
                  placeholder="Search clinic (optional)..."
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-emerald-500/40 focus:ring"
                />
                <input type="hidden" name="clinicId" value={selectedClinicId} />
                {clinicSearchOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-emerald-500/40 bg-slate-900 py-1 shadow-xl">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedClinicId("");
                        setClinicSearch("");
                        setClinicSearchOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-emerald-500/20"
                    >
                      Any clinic
                    </button>
                    {(clinicSearch ? clinics.filter((c) => c.label.toLowerCase().includes(clinicSearch.toLowerCase())) : clinics).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedClinicId(c.id);
                          setClinicSearch("");
                          setClinicSearchOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-emerald-500/20"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    name="date"
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Time</label>
                  <input
                    name="time"
                    type="time"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reason (optional)</label>
                <input
                  name="reason"
                  type="text"
                  placeholder="e.g. Annual checkup"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBook(false)}
                  className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking || !selectedDoctorId}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {booking ? "Booking..." : "Request appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Upcoming
        </h2>
        <div className="space-y-3">
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">No upcoming appointments.</p>
              <button
                type="button"
                onClick={() => {
                  setShowBook(true);
                  setBookError(null);
                  setSelectedDoctorId("");
                  setSelectedClinicId("");
                  setDoctorSearch("");
                  setClinicSearch("");
                  loadOptions();
                }}
                className="mt-3 inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Book appointment
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Or click the button above.
              </p>
            </div>
          ) : (
            upcomingAppointments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      Dr. {a.doctorName}
                      {a.clinicName && (
                        <span className="text-slate-400"> @ {a.clinicName}</span>
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
                    <p className="mt-1 text-xs text-slate-500">ID: {a.id.slice(-8)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.status === "CONFIRMED" && isToday(a) && (
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
                      className={`rounded-full px-3 py-0.5 text-[0.7rem] font-medium ${
                        a.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {formatStatus(a.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancel(a.id)}
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

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Past
        </h2>
        <div className="space-y-2">
          {pastAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">No past appointments.</p>
          ) : (
            pastAppointments.map((a) => (
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
                    {formatStatus(a.status)}
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
    </div>
  );
}
