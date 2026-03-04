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
  patientName: string;
  patientMrn: string;
  patientId?: string;
  doctorId?: string;
  doctorName: string;
  clinicName: string | null;
};

type Option = { id: string; label: string; mrn?: string; full?: boolean };

export default function ReceptionistAppointmentsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{
    todayAppointments: Appointment[];
    upcomingAppointments: Appointment[];
    pastAppointments: Appointment[];
  } | null>(null);
  const [doctors, setDoctors] = useState<Option[]>([]);
  const [patients, setPatients] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBook, setShowBook] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [appointmentView, setAppointmentView] = useState<"today" | "upcoming" | "past">("today");
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
  const [bookDate, setBookDate] = useState("");
  const [bookDoctor, setBookDoctor] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [doctorSearchOpen, setDoctorSearchOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [callNextInfo, setCallNextInfo] = useState<
    { doctorId: string; doctorName: string; nextPatient: { name: string; mrn: string } | null }[]
  >([]);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (doctorFilter) params.set("doctorId", doctorFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (viewMode === "week") {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        params.set("from", start.toISOString());
        params.set("to", end.toISOString());
      }
      const res = await fetch(`/api/receptionist/appointments?${params}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData({
        todayAppointments: json.todayAppointments ?? [],
        upcomingAppointments: json.upcomingAppointments ?? [],
        pastAppointments: json.pastAppointments ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router, doctorFilter, statusFilter, searchQuery, viewMode]);

  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/receptionist/options");
      if (!res.ok) throw new Error("Failed to load options");
      const json = await res.json();
      setDoctors(json.doctors ?? []);
      setPatients(json.patients ?? []);
    } catch {
      setDoctors([]);
      setPatients([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadCallNext() {
    try {
      const res = await fetch("/api/receptionist/call-next");
      const json = await res.json();
      setCallNextInfo(json.callNextInfo ?? []);
    } catch {
      setCallNextInfo([]);
    }
  }

  useEffect(() => {
    loadCallNext();
    const interval = setInterval(loadCallNext, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (searchParams.get("book") === "1") {
      setShowBook(true);
    }
  }, [searchParams]);

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

  const loadSlotsForBooking = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await fetch(
        `/api/receptionist/doctors/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`
      );
      const json = await res.json();
      setAvailableSlots(json.slots ?? []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showBook && bookDoctor && bookDate) {
      loadSlotsForBooking(bookDoctor, bookDate);
    } else {
      setAvailableSlots([]);
    }
  }, [showBook, bookDoctor, bookDate, loadSlotsForBooking]);

  useEffect(() => {
    if (rescheduleId && rescheduleDoctorId && rescheduleDate) {
      setRescheduleSlotsLoading(true);
      fetch(
        `/api/receptionist/doctors/slots?doctorId=${encodeURIComponent(rescheduleDoctorId)}&date=${encodeURIComponent(rescheduleDate)}`
      )
        .then((r) => r.json())
        .then((j) => setRescheduleSlots(j.slots ?? []))
        .catch(() => setRescheduleSlots([]))
        .finally(() => setRescheduleSlotsLoading(false));
    } else {
      setRescheduleSlots([]);
    }
  }, [rescheduleId, rescheduleDoctorId, rescheduleDate]);

  const prefillPatient = searchParams.get("patientId") || "";

  useEffect(() => {
    if (showBook) {
      setSelectedPatientId(prefillPatient || "");
      setPatientSearch("");
      setDoctorSearch("");
    }
  }, [showBook, prefillPatient]);

  async function handleUpdateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/receptionist/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      if (status === "COMPLETED") {
        await fetch(`/api/receptionist/appointments/${id}/ensure-invoice`, { method: "POST" });
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCheckIn(id: string) {
    setCheckingInId(id);
    try {
      const res = await fetch(`/api/receptionist/appointments/${id}/check-in`, {
        method: "POST",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to check in");
      await loadData();
      setError(null);
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setCheckingInId(null);
    }
  }

  async function handleBook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBookError(null);
    const form = new FormData(e.currentTarget);
    const patientId = form.get("patientId") as string;
    const doctorId = form.get("doctorId") as string;
    const dateStr = form.get("date") as string;
    const timeStr = form.get("time") as string;
    const reason = (form.get("reason") as string) || undefined;

    if (!patientId || !doctorId || !dateStr || !timeStr) {
      setBookError("Patient, doctor, date, and time are required.");
      return;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    const startAt = new Date(year, month - 1, day, hour, minute);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);

    setBooking(true);
    try {
      const res = await fetch("/api/receptionist/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to book");
      setShowBook(false);
      (e.target as HTMLFormElement).reset();
      router.replace("/receptionist/appointments");
      await loadData();
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBooking(false);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleId || !rescheduleDate || !rescheduleTime) return;
    const [year, month, day] = rescheduleDate.split("-").map(Number);
    const [hour, minute] = rescheduleTime.split(":").map(Number);
    const startAt = new Date(year, month - 1, day, hour, minute);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    setUpdatingId(rescheduleId);
    try {
      const res = await fetch(`/api/receptionist/appointments/${rescheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to reschedule");
      setRescheduleId(null);
      setRescheduleDate("");
      setRescheduleTime("");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reschedule");
    } finally {
      setUpdatingId(null);
    }
  }

  const allAppointments = [
    ...(data?.todayAppointments ?? []),
    ...(data?.upcomingAppointments ?? []),
  ];
  const doctorsForFilter =
    doctors.length > 0
      ? doctors.map((d) => ({ id: d.id, label: d.label }))
      : [...new Map(
          allAppointments
            .filter((a) => a.doctorId)
            .map((a) => [a.doctorId, { id: a.doctorId!, label: a.doctorName }]),
        ).values()];

  const renderAppointment = (a: Appointment, showActions: boolean, showCheckIn = false) => (
    <div
      key={a.id}
      className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{a.patientName}</p>
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
          <p className="mt-1 text-xs text-slate-500">
            MRN: {a.patientMrn} • {a.doctorName} • ID: {a.id.slice(-8)}
          </p>
          {a.reason && (
            <p className="mt-1 text-xs text-slate-500">Reason: {a.reason}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-medium ${
              a.status === "CONFIRMED"
                ? "bg-emerald-500/20 text-emerald-200"
                : a.status === "NO_SHOW"
                  ? "bg-red-500/20 text-red-200"
                  : a.status === "CANCELLED"
                    ? "bg-slate-600/50 text-slate-300"
                    : "bg-amber-500/20 text-amber-200"
            }`}
          >
            {formatStatus(a.status)}
          </span>
          {showActions &&
            (a.status === "REQUESTED" || a.status === "CONFIRMED") && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-xs">
                {a.status === "REQUESTED" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(a.id, "CONFIRMED")}
                    disabled={updatingId === a.id}
                    className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                {showCheckIn && a.status === "CONFIRMED" && (
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
                {a.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(a.id, "COMPLETED")}
                    disabled={updatingId === a.id}
                    className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Complete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(a.startAt);
                    setRescheduleId(a.id);
                    setRescheduleDoctorId(a.doctorId ?? "");
                    setRescheduleDate(d.toISOString().split("T")[0]);
                    setRescheduleTime("");
                    setRescheduleSlots([]);
                  }}
                  disabled={updatingId === a.id}
                  className="rounded-full border border-emerald-500/50 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(a.id, "NO_SHOW")}
                  disabled={updatingId === a.id}
                  className="rounded-full border border-red-500/50 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  No-show
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(a.id, "CANCELLED")}
                  disabled={updatingId === a.id}
                  className="rounded-full border border-slate-500/50 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-500/10 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );

  const today = data?.todayAppointments ?? [];
  const upcoming = data?.upcomingAppointments ?? [];
  const past = data?.pastAppointments ?? [];

  return (
    <div className="space-y-6">
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
      {callNextInfo.length > 0 && appointmentView === "today" && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <h3 className="text-sm font-semibold text-emerald-200">Send next patient</h3>
          <div className="mt-2 space-y-1">
            {callNextInfo.map((c) => (
              <p key={c.doctorId} className="text-sm text-emerald-100">
                <strong>{c.doctorName}</strong> is ready —{" "}
                {c.nextPatient ? (
                  <>send in <strong>{c.nextPatient.name}</strong> (MRN: {c.nextPatient.mrn})</>
                ) : (
                  "no patient in queue"
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Appointments</h1>
          <p className="mt-1 text-sm text-slate-400">
            View and manage clinic appointments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowBook(true);
            setBookError(null);
            loadOptions();
          }}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Book appointment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by patient name or MRN"
          className="rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none w-64"
        />
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All doctors</option>
          {doctorsForFilter.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No-show</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setShowAvailability(true);
            loadAvailability();
          }}
          className="rounded-xl border border-emerald-500/50 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
        >
          View availability
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              viewMode === "list"
                ? "bg-emerald-500/30 text-emerald-200"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              viewMode === "week"
                ? "bg-emerald-500/30 text-emerald-200"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Today / Upcoming / Past toggle */}
      <div className="flex gap-2 border-b border-emerald-500/20 pb-3">
        <button
          type="button"
          onClick={() => setAppointmentView("today")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            appointmentView === "today"
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Today ({today.length})
        </button>
        <button
          type="button"
          onClick={() => setAppointmentView("upcoming")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            appointmentView === "upcoming"
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setAppointmentView("past")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            appointmentView === "past"
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Past ({past.length})
        </button>
      </div>

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

      {/* Reschedule modal */}
      {rescheduleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Reschedule appointment</h2>
            <p className="mb-3 text-xs text-slate-400">Appointment #{rescheduleId.slice(-8)} — updating time only, same ID</p>
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Time</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                  disabled={!rescheduleDate || rescheduleSlotsLoading}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
                >
                  <option value="">
                    {!rescheduleDate
                      ? "Select date first"
                      : rescheduleSlotsLoading
                        ? "Loading slots..."
                        : rescheduleSlots.filter((s) => s.available).length === 0
                          ? "No slots available"
                          : "Select time"}
                  </option>
                  {rescheduleSlots
                    .filter((s) => s.available)
                    .map((s) => (
                      <option key={s.time} value={s.time}>
                        {s.time}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    updatingId === rescheduleId ||
                    (!!rescheduleDate &&
                      !rescheduleSlotsLoading &&
                      rescheduleSlots.filter((s) => s.available).length === 0)
                  }
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleId(null);
                    setRescheduleDoctorId("");
                    setRescheduleDate("");
                    setRescheduleTime("");
                    setRescheduleSlots([]);
                  }}
                  className="rounded-full border border-slate-500/50 px-4 py-2 text-sm font-medium text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Book appointment</h2>
              <button
                type="button"
                onClick={() => {
                  setShowBook(false);
                  setBookDoctor("");
                  setBookDate("");
                  setSelectedPatientId("");
                  setAvailableSlots([]);
                  router.replace("/receptionist/appointments");
                }}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleBook} className="space-y-4">
              {bookError && <p className="text-sm text-red-400">{bookError}</p>}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-300 mb-1">Patient</label>
                <input
                  type="text"
                  value={
                    selectedPatientId
                      ? (() => {
                          const p = patients.find((x) => x.id === selectedPatientId);
                          return p ? `${p.label}${p.mrn ? ` (MRN: ${p.mrn})` : ""}` : patientSearch;
                        })()
                      : patientSearch
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setPatientSearch(v);
                    if (selectedPatientId) setSelectedPatientId("");
                    setPatientSearchOpen(true);
                  }}
                  onFocus={() => setPatientSearchOpen(true)}
                  onBlur={() => setTimeout(() => setPatientSearchOpen(false), 150)}
                  placeholder="Search patient by name or MRN..."
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-emerald-500/40 focus:ring"
                />
                <input type="hidden" name="patientId" value={selectedPatientId} />
                {patientSearchOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-emerald-500/40 bg-slate-900 py-1 shadow-xl">
                    {(() => {
                      const filtered = patientSearch
                        ? patients.filter(
                            (p) =>
                              p.label.toLowerCase().includes(patientSearch.toLowerCase()) ||
                              (p.mrn && p.mrn.toLowerCase().includes(patientSearch.toLowerCase())),
                          )
                        : patients;
                      if (filtered.length === 0) {
                        return <p className="px-3 py-2 text-xs text-slate-500">No patients found</p>;
                      }
                      return filtered.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedPatientId(p.id);
                            setPatientSearch("");
                            setPatientSearchOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-emerald-500/20"
                        >
                          {p.label} {p.mrn ? `(MRN: ${p.mrn})` : ""}
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-slate-300 mb-1">Doctor</label>
                <input
                  type="text"
                  value={
                    bookDoctor
                      ? doctors.find((d) => d.id === bookDoctor)?.label ?? doctorSearch
                      : doctorSearch
                  }
                  onChange={(e) => {
                    setDoctorSearch(e.target.value);
                    if (!e.target.value) {
                      setBookDoctor("");
                      setBookDate("");
                    }
                    setDoctorSearchOpen(true);
                  }}
                  onFocus={() => setDoctorSearchOpen(true)}
                  onBlur={() => setTimeout(() => setDoctorSearchOpen(false), 150)}
                  placeholder="Search doctor by name..."
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-emerald-500/40 focus:ring"
                />
                <input type="hidden" name="doctorId" value={bookDoctor} />
                {doctorSearchOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-emerald-500/40 bg-slate-900 py-1 shadow-xl">
                    {(() => {
                      const filtered = (doctorSearch
                        ? doctors.filter((d) =>
                            d.label.toLowerCase().includes(doctorSearch.toLowerCase()),
                          )
                        : doctors
                      ).filter((d) => !d.full);
                      if (filtered.length === 0) {
                        return <p className="px-3 py-2 text-xs text-slate-500">No doctors found</p>;
                      }
                      return filtered.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBookDoctor(d.id);
                            setBookDate("");
                            setDoctorSearch("");
                            setDoctorSearchOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-emerald-500/20"
                        >
                          {d.label}
                        </button>
                      ));
                    })()}
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
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Time</label>
                  <select
                    name="time"
                    required
                    disabled={!bookDoctor || !bookDate || slotsLoading}
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
                  >
                    <option value="">
                      {!bookDoctor || !bookDate
                        ? "Select doctor and date first"
                        : slotsLoading
                          ? "Loading slots..."
                          : availableSlots.filter((s) => s.available).length === 0
                            ? "No slots available"
                            : "Select time"}
                    </option>
                    {availableSlots
                      .filter((s) => s.available)
                      .map((s) => (
                        <option key={s.time} value={s.time}>
                          {s.time}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reason (optional)</label>
                <input
                  name="reason"
                  type="text"
                  placeholder="e.g. Check-up"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={
                  booking ||
                  !selectedPatientId ||
                  !bookDoctor ||
                  (!!bookDoctor &&
                    !!bookDate &&
                    !slotsLoading &&
                    availableSlots.filter((s) => s.available).length === 0)
                }
                className="w-full rounded-full bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {booking ? "Booking..." : "Book appointment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-red-300">{error}</p>
          <Link href="/auth" className="mt-4 inline-block text-emerald-300 hover:underline">
            Go to login
          </Link>
        </div>
      ) : viewMode === "week" ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-200">This week</h3>
          <div className="space-y-2">
            {allAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments this week.</p>
            ) : (
              allAppointments.map((a) => renderAppointment(a, true))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4">
          {appointmentView === "today" && (
            <>
              <h2 className="mb-3 text-base font-semibold text-emerald-200">Today</h2>
              {today.length === 0 ? (
                <p className="text-sm text-slate-500">No appointments today.</p>
              ) : (
                <div className="space-y-3">{today.map((a) => renderAppointment(a, true, true))}</div>
              )}
            </>
          )}
          {appointmentView === "upcoming" && (
            <>
              <h2 className="mb-3 text-base font-semibold text-emerald-200">Upcoming</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming appointments.</p>
              ) : (
                <div className="space-y-3">{upcoming.map((a) => renderAppointment(a, true))}</div>
              )}
            </>
          )}
          {appointmentView === "past" && (
            <>
              <h2 className="mb-3 text-base font-semibold text-emerald-200">Past</h2>
              {past.length === 0 ? (
                <p className="text-sm text-slate-500">No past appointments.</p>
              ) : (
                <div className="space-y-2">
                  {past.map((a) => renderAppointment(a, false))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
