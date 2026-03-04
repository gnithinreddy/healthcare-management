"use client";

import { useCallback, useEffect, useState } from "react";

type AppointmentStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

type AppointmentRow = {
  id: string;
  patientName: string;
  doctorName: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reason: string | null;
  clinicName: string | null;
};

type AppointmentsResponse = {
  appointments: AppointmentRow[];
};

type AppointmentDetail = AppointmentRow & {
  patientId: string;
  doctorId: string;
  clinicId: string | null;
  createdAt: string;
};

type OptionsResponse = {
  patients: { id: string; label: string; mrn: string }[];
  doctors: { id: string; label: string; specialization: string | null }[];
  clinics: { id: string; label: string }[];
};

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppointmentDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionsResponse | null>(null);

  const closeModal = useCallback(() => {
    setSelectedId(null);
    setSelected(null);
    setSelectedError(null);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedId) closeModal();
        else if (addModalOpen) setAddModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedId, addModalOpen, closeModal]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/admin/appointments?${params}`);
      const json = (await res.json()) as AppointmentsResponse;
      if (!res.ok) throw new Error((json as { error?: string })?.error ?? "Failed to load");
      setAppointments(json.appointments ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = appointments.filter((a) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    const patient = a.patientName.toLowerCase();
    const doctor = a.doctorName.toLowerCase();
    return patient.includes(term) || doctor.includes(term);
  });

  const loadOptions = useCallback(async () => {
    const res = await fetch("/api/admin/appointments?list=options");
    const json = (await res.json()) as OptionsResponse;
    if (res.ok) setOptions(json);
  }, []);

  useEffect(() => {
    if (addModalOpen) loadOptions();
  }, [addModalOpen, loadOptions]);

  async function handleSelect(id: string) {
    if (selectedId === id) {
      closeModal();
      return;
    }
    try {
      setSelectedLoading(true);
      setSelectedError(null);
      setSelectedId(id);
      const res = await fetch(`/api/admin/appointments/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setSelected(json.appointment);
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSelectedLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setSelectedError(null);

    const form = new FormData(e.currentTarget);
    const startAt = form.get("startAt") as string;
    const endAt = form.get("endAt") as string;
    const status = form.get("status") as AppointmentStatus;
    const reason = (form.get("reason") as string)?.trim() || null;

    try {
      const res = await fetch(`/api/admin/appointments/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt, endAt, status, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      await loadAppointments();
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm("Delete this appointment?")) return;
    try {
      const res = await fetch(`/api/admin/appointments/${selected.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to delete");
      await loadAppointments();
      closeModal();
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    const form = new FormData(e.currentTarget);
    const patientId = form.get("patientId") as string;
    const doctorId = form.get("doctorId") as string;
    const clinicId = (form.get("clinicId") as string) || undefined;
    const startAt = form.get("startAt") as string;
    const endAt = form.get("endAt") as string;
    const reason = (form.get("reason") as string)?.trim() || undefined;
    const status = (form.get("status") as AppointmentStatus) || "REQUESTED";

    if (!patientId || !doctorId || !startAt || !endAt) {
      setAddError("Patient, doctor, start and end times are required.");
      setAddLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId,
          clinicId,
          startAt,
          endAt,
          reason,
          status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to create");
      await loadAppointments();
      setAddModalOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Appointments</h1>
          <p className="text-xs text-slate-400">
            View and manage appointments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddModalOpen(true);
            setAddError(null);
          }}
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-[0.75rem] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"
        >
          + Add appointment
        </button>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4">
        <div className="mb-3 flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient or doctor..."
            className="w-full rounded-full border border-emerald-500/30 bg-slate-950/80 px-3 py-1.5 text-[0.75rem] text-white outline-none ring-emerald-500/30 focus:ring sm:w-48"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-full border border-emerald-500/30 bg-slate-950/80 px-3 py-1.5 text-[0.75rem] text-white outline-none ring-emerald-500/30 focus:ring"
            />
            <span className="flex items-center text-slate-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-full border border-emerald-500/30 bg-slate-950/80 px-3 py-1.5 text-[0.75rem] text-white outline-none ring-emerald-500/30 focus:ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-emerald-500/30 bg-slate-950/80 px-3 py-1.5 text-[0.75rem] text-white outline-none ring-emerald-500/30 focus:ring sm:w-36"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-slate-200">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 text-left font-medium">Patient</th>
                <th className="py-2 pr-4 text-left font-medium">Doctor</th>
                <th className="py-2 pr-4 text-left font-medium">Date & time</th>
                <th className="py-2 pr-4 text-left font-medium">Status</th>
                <th className="py-2 text-left font-medium">Clinic</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-red-400">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    {appointments.length === 0
                      ? "No appointments found."
                      : "No appointments match your search."}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredAppointments.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => handleSelect(a.id)}
                    className={`border-t border-slate-900/80 cursor-pointer ${
                      selectedId === a.id
                        ? "bg-slate-900/90"
                        : "hover:bg-slate-900/80"
                    }`}
                  >
                    <td className="py-2 pr-4 font-medium text-emerald-200">
                      {a.patientName}
                    </td>
                    <td className="py-2 pr-4">Dr. {a.doctorName}</td>
                    <td className="py-2 pr-4 text-slate-400">
                      {new Date(a.startAt).toLocaleString()} –{" "}
                      {new Date(a.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-medium ${
                          a.status === "CONFIRMED"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : a.status === "COMPLETED"
                              ? "bg-slate-600/50 text-slate-300"
                              : a.status === "CANCELLED" || a.status === "NO_SHOW"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-amber-500/20 text-amber-200"
                        }`}
                      >
                        {a.status.toLowerCase().replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400">
                      {a.clinicName ?? "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-emerald-200">
                Appointment details
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {selectedLoading ? (
              <p className="py-8 text-center text-slate-500">Loading...</p>
            ) : selectedError && !selected ? (
              <p className="py-8 text-red-400">{selectedError}</p>
            ) : selected ? (
              <form onSubmit={handleSave} className="space-y-3 text-xs text-slate-200">
                {selectedError && (
                  <p className="text-red-400">{selectedError}</p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[0.7rem] font-medium text-slate-200">
                      Patient
                    </label>
                    <input
                      disabled
                      value={selected.patientName}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.7rem] font-medium text-slate-200">
                      Doctor
                    </label>
                    <input
                      disabled
                      value={`Dr. ${selected.doctorName}`}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-300"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="startAt"
                      className="text-[0.7rem] font-medium text-slate-200"
                    >
                      Start
                    </label>
                    <input
                      id="startAt"
                      name="startAt"
                      type="datetime-local"
                      defaultValue={
                        selected.startAt
                          ? new Date(selected.startAt).toISOString().slice(0, 16)
                          : ""
                      }
                      required
                      className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="endAt"
                      className="text-[0.7rem] font-medium text-slate-200"
                    >
                      End
                    </label>
                    <input
                      id="endAt"
                      name="endAt"
                      type="datetime-local"
                      defaultValue={
                        selected.endAt
                          ? new Date(selected.endAt).toISOString().slice(0, 16)
                          : ""
                      }
                      required
                      className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="status"
                    className="text-[0.7rem] font-medium text-slate-200"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={selected.status}
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="reason"
                    className="text-[0.7rem] font-medium text-slate-200"
                  >
                    Reason
                  </label>
                  <input
                    id="reason"
                    name="reason"
                    type="text"
                    defaultValue={selected.reason ?? ""}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-full border border-red-500/60 px-3 py-1.5 text-[0.75rem] font-medium text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.8rem] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* Add modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-emerald-200">
                Add appointment
              </h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs text-slate-200">
              {addError && <p className="text-red-400">{addError}</p>}
              <div className="space-y-1">
                <label
                  htmlFor="add-patientId"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Patient *
                </label>
                <select
                  id="add-patientId"
                  name="patientId"
                  required
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                >
                  <option value="">Select patient</option>
                  {options?.patients?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="add-doctorId"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Doctor *
                </label>
                <select
                  id="add-doctorId"
                  name="doctorId"
                  required
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                >
                  <option value="">Select doctor</option>
                  {options?.doctors?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                      {d.specialization ? ` - ${d.specialization}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="add-clinicId"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Clinic
                </label>
                <select
                  id="add-clinicId"
                  name="clinicId"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                >
                  <option value="">Select clinic (optional)</option>
                  {options?.clinics?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="add-startAt"
                    className="text-[0.7rem] font-medium text-slate-200"
                  >
                    Start *
                  </label>
                  <input
                    id="add-startAt"
                    name="startAt"
                    type="datetime-local"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="add-endAt"
                    className="text-[0.7rem] font-medium text-slate-200"
                  >
                    End *
                  </label>
                  <input
                    id="add-endAt"
                    name="endAt"
                    type="datetime-local"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="add-status"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Status
                </label>
                <select
                  id="add-status"
                  name="status"
                  defaultValue="REQUESTED"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="add-reason"
                  className="text-[0.7rem] font-medium text-slate-200"
                >
                  Reason
                </label>
                <input
                  id="add-reason"
                  name="reason"
                  type="text"
                  placeholder="Optional"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-[0.75rem] font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.8rem] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {addLoading ? "Creating..." : "Add appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
