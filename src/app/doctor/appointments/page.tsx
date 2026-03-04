"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function DrugNameAutocomplete({
  value,
  onChange,
  placeholder = "Drug name *",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/doctor/drugs?q=${encodeURIComponent(q)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((json) => {
          const drugs = json.drugs ?? [];
          setSuggestions(drugs);
          setOpen(drugs.length > 0);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length >= 2 && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {suggestions.map((drug) => (
            <button
              key={drug}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(drug);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-emerald-500/20"
            >
              {drug}
            </button>
          ))}
        </div>
      )}
      {loading && value.trim().length >= 2 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  reason: string | null;
  patientName: string;
  patientMrn: string;
  clinicName: string | null;
  prescriptionId?: string | null;
  prescriptionStatus?: string | null;
};

export default function DoctorAppointmentsPage() {
  const [data, setData] = useState<{
    todayAppointments: Appointment[];
    upcomingAppointments: Appointment[];
    pastAppointments: Appointment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [callingNext, setCallingNext] = useState(false);
  const [completeModalAppt, setCompleteModalAppt] = useState<Appointment | null>(null);
  const [prescriptionModalAppt, setPrescriptionModalAppt] = useState<Appointment | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<{ drugName: string; dosage: string; frequency: string; instructions: string }[]>([{ drugName: "", dosage: "", frequency: "", instructions: "" }]);
  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [completingWithPrescription, setCompletingWithPrescription] = useState(false);
  const [sendingToPharmacyId, setSendingToPharmacyId] = useState<string | null>(null);
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
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/doctor/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  function openCompleteModal(a: Appointment) {
    setCompleteModalAppt(a);
    setPrescriptionItems([{ drugName: "", dosage: "", frequency: "", instructions: "" }]);
  }

  async function handleCompleteWithPrescription() {
    if (!completeModalAppt) return;
    const validItems = prescriptionItems.filter((i) => i.drugName.trim());
    setCompletingWithPrescription(true);
    try {
      const res = await fetch(`/api/doctor/appointments/${completeModalAppt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to complete");
      if (validItems.length > 0) {
        const presRes = await fetch("/api/doctor/prescriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: completeModalAppt.id,
            items: validItems.map((i) => ({
              drugName: i.drugName.trim(),
              dosage: i.dosage.trim() || null,
              frequency: i.frequency.trim() || null,
              instructions: i.instructions.trim() || null,
            })),
          }),
        });
        if (!presRes.ok) {
          const presJson = await presRes.json().catch(() => ({}));
          throw new Error(presJson?.error ?? "Appointment completed but prescription failed.");
        }
        const presJson = await presRes.json().catch(() => ({}));
        const prescriptionId = presJson?.id;
        if (prescriptionId) {
          const sendRes = await fetch(`/api/doctor/prescriptions/${prescriptionId}/send-to-pharmacy`, {
            method: "POST",
          });
          if (!sendRes.ok) {
            const sendJson = await sendRes.json().catch(() => ({}));
            throw new Error(sendJson?.error ?? "Prescription created but failed to send to pharmacy.");
          }
        }
      }
      setCompleteModalAppt(null);
      setPrescriptionItems([{ drugName: "", dosage: "", frequency: "", instructions: "" }]);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete");
    } finally {
      setCompletingWithPrescription(false);
    }
  }

  async function handleCreatePrescription() {
    if (!prescriptionModalAppt) return;
    const validItems = prescriptionItems.filter((i) => i.drugName.trim());
    if (validItems.length === 0) {
      alert("Add at least one drug.");
      return;
    }
    setCreatingPrescription(true);
    try {
      const res = await fetch("/api/doctor/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: prescriptionModalAppt.id,
          items: validItems.map((i) => ({
            drugName: i.drugName.trim(),
            dosage: i.dosage.trim() || null,
            frequency: i.frequency.trim() || null,
            instructions: i.instructions.trim() || null,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to create");
      const prescriptionId = json?.id;
      if (prescriptionId) {
        const sendRes = await fetch(`/api/doctor/prescriptions/${prescriptionId}/send-to-pharmacy`, {
          method: "POST",
        });
        if (!sendRes.ok) {
          const sendJson = await sendRes.json().catch(() => ({}));
          throw new Error(sendJson?.error ?? "Prescription created but failed to send to pharmacy.");
        }
      }
      setPrescriptionModalAppt(null);
      setPrescriptionItems([{ drugName: "", dosage: "", frequency: "", instructions: "" }]);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create prescription");
    } finally {
      setCreatingPrescription(false);
    }
  }

  async function handleSendToPharmacy(prescriptionId: string) {
    setSendingToPharmacyId(prescriptionId);
    try {
      const res = await fetch(`/api/doctor/prescriptions/${prescriptionId}/send-to-pharmacy`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to send");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingToPharmacyId(null);
    }
  }

  async function handleCallNext() {
    setCallingNext(true);
    try {
      const res = await fetch("/api/doctor/call-next", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to send");
      alert("Next patient request sent. Reception has been notified.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setCallingNext(false);
    }
  }

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

  const today = data?.todayAppointments ?? [];
  const upcoming = data?.upcomingAppointments ?? [];
  const past = data?.pastAppointments ?? [];

  const renderAppointment = (a: Appointment, showActions: boolean) => {
    const hasPrescription = !!a.prescriptionId;
    const canCreatePrescription = a.status === "COMPLETED" && !hasPrescription;
    const canSendToPharmacy = hasPrescription && a.prescriptionStatus === "CREATED";

    return (
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
          <p className="mt-1 text-xs text-slate-500">MRN: {a.patientMrn}</p>
          {a.clinicName && (
            <p className="mt-1 text-xs text-slate-500">@{a.clinicName}</p>
          )}
          {a.reason && (
            <p className="mt-1 text-xs text-slate-500">Reason: {a.reason}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-medium ${
              a.status === "CONFIRMED"
                ? "bg-emerald-500/20 text-emerald-200"
                : a.status === "COMPLETED"
                  ? "bg-slate-600/50 text-slate-300"
                  : a.status === "NO_SHOW"
                    ? "bg-red-500/20 text-red-200"
                    : "bg-amber-500/20 text-amber-200"
            }`}
          >
            {formatStatus(a.status)}
          </span>
          {showActions && (a.status === "REQUESTED" || a.status === "CONFIRMED") && (
              <div className="flex gap-2">
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
                <button
                  type="button"
                  onClick={() => openCompleteModal(a)}
                  disabled={updatingId === a.id}
                  className="rounded-full border border-emerald-500/50 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  Complete
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
          {!showActions && (a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "NO_SHOW") && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(a.id, "CONFIRMED")}
                disabled={updatingId === a.id}
                className="rounded-full border border-emerald-500/50 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                Reactivate
              </button>
              {a.status === "COMPLETED" && canCreatePrescription && (
                <button
                  type="button"
                  onClick={() => {
                    setPrescriptionModalAppt(a);
                    setPrescriptionItems([{ drugName: "", dosage: "", frequency: "", instructions: "" }]);
                  }}
                  className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Create prescription
                </button>
              )}
              {canSendToPharmacy && a.prescriptionId && (
                <button
                  type="button"
                  onClick={() => handleSendToPharmacy(a.prescriptionId!)}
                  disabled={sendingToPharmacyId === a.prescriptionId}
                  className="rounded-full border border-emerald-500/50 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {sendingToPharmacyId === a.prescriptionId ? "Sending..." : "Send to pharmacy"}
                </button>
              )}
              {hasPrescription && a.prescriptionStatus === "SENT_TO_PHARMACY" && (
                <span className="rounded-full bg-slate-600/50 px-3 py-0.5 text-xs text-slate-400">
                  Sent to pharmacy
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Appointments</h1>
          <p className="mt-1 text-sm text-slate-400">
            View and manage your appointment schedule.
          </p>
        </div>
        {today.length > 0 && (
          <button
            type="button"
            onClick={handleCallNext}
            disabled={callingNext}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {callingNext ? "Sending..." : "Send next patient"}
          </button>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Today
        </h2>
        {today.length === 0 ? (
          <p className="text-sm text-slate-500">No appointments today.</p>
        ) : (
          <div className="space-y-3">{today.map((a) => renderAppointment(a, true))}</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming appointments.</p>
        ) : (
          <div className="space-y-3">{upcoming.map((a) => renderAppointment(a, true))}</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-slate-500">No past appointments.</p>
        ) : (
          <div className="space-y-2">
            {past.slice(0, 10).map((a) => renderAppointment(a, false))}
            {past.length > 10 && (
              <p className="text-xs text-slate-500">
                Showing 10 of {past.length} past appointments
              </p>
            )}
          </div>
        )}
      </section>

      {/* Complete appointment modal (with optional prescriptions) */}
      {completeModalAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setCompleteModalAppt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-emerald-200">Complete appointment</h2>
            <p className="mt-1 text-sm text-slate-400">{completeModalAppt.patientName} • {completeModalAppt.patientMrn}</p>
            <p className="mt-3 text-sm font-medium text-slate-300">Add prescriptions (optional)</p>
            <div className="mt-3 space-y-3">
              {prescriptionItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 space-y-2">
                  <DrugNameAutocomplete
                    value={item.drugName}
                    onChange={(v) => {
                      const next = [...prescriptionItems];
                      next[idx] = { ...next[idx], drugName: v };
                      setPrescriptionItems(next);
                    }}
                    placeholder="Start typing drug name (e.g. tyle, ibup...)"
                    disabled={completingWithPrescription}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={(e) => {
                        const next = [...prescriptionItems];
                        next[idx] = { ...next[idx], dosage: e.target.value };
                        setPrescriptionItems(next);
                      }}
                      placeholder="Dosage"
                      disabled={completingWithPrescription}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                    />
                    <input
                      type="text"
                      value={item.frequency}
                      onChange={(e) => {
                        const next = [...prescriptionItems];
                        next[idx] = { ...next[idx], frequency: e.target.value };
                        setPrescriptionItems(next);
                      }}
                      placeholder="Frequency"
                      disabled={completingWithPrescription}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={item.instructions}
                    onChange={(e) => {
                      const next = [...prescriptionItems];
                      next[idx] = { ...next[idx], instructions: e.target.value };
                      setPrescriptionItems(next);
                    }}
                    placeholder="Instructions"
                    disabled={completingWithPrescription}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPrescriptionItems([...prescriptionItems, { drugName: "", dosage: "", frequency: "", instructions: "" }])}
                disabled={completingWithPrescription}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/40 py-3 text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-colors"
              >
                <span className="text-xl font-bold">+</span>
                <span className="text-sm font-medium">Add prescription</span>
              </button>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleCompleteWithPrescription}
                disabled={completingWithPrescription}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {completingWithPrescription ? "Completing..." : "Complete"}
              </button>
              <button
                type="button"
                onClick={() => setCompleteModalAppt(null)}
                disabled={completingWithPrescription}
                className="rounded-full border border-slate-500/50 px-4 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create prescription modal (for past completed appointments) */}
      {prescriptionModalAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPrescriptionModalAppt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-emerald-200">Create prescription</h2>
            <p className="mt-1 text-sm text-slate-400">{prescriptionModalAppt.patientName} • {prescriptionModalAppt.patientMrn}</p>
            <div className="mt-4 space-y-3">
              {prescriptionItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 space-y-2">
                  <DrugNameAutocomplete
                    value={item.drugName}
                    onChange={(v) => {
                      const next = [...prescriptionItems];
                      next[idx] = { ...next[idx], drugName: v };
                      setPrescriptionItems(next);
                    }}
                    placeholder="Start typing drug name (e.g. tyle, ibup...)"
                    disabled={creatingPrescription}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={(e) => {
                        const next = [...prescriptionItems];
                        next[idx] = { ...next[idx], dosage: e.target.value };
                        setPrescriptionItems(next);
                      }}
                      placeholder="Dosage"
                      disabled={creatingPrescription}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                    />
                    <input
                      type="text"
                      value={item.frequency}
                      onChange={(e) => {
                        const next = [...prescriptionItems];
                        next[idx] = { ...next[idx], frequency: e.target.value };
                        setPrescriptionItems(next);
                      }}
                      placeholder="Frequency"
                      disabled={creatingPrescription}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={item.instructions}
                    onChange={(e) => {
                      const next = [...prescriptionItems];
                      next[idx] = { ...next[idx], instructions: e.target.value };
                      setPrescriptionItems(next);
                    }}
                    placeholder="Instructions"
                    disabled={creatingPrescription}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPrescriptionItems([...prescriptionItems, { drugName: "", dosage: "", frequency: "", instructions: "" }])}
                disabled={creatingPrescription}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/40 py-3 text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-colors"
              >
                <span className="text-xl font-bold">+</span>
                <span className="text-sm font-medium">Add prescription</span>
              </button>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleCreatePrescription}
                disabled={creatingPrescription}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {creatingPrescription ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setPrescriptionModalAppt(null)}
                className="rounded-full border border-slate-500/50 px-4 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
