"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReceptionistBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  const [billingSearch, setBillingSearch] = useState("");
  const [billingSearching, setBillingSearching] = useState(false);
  const [billingResult, setBillingResult] = useState<{
    patient: { id: string; mrn: string; firstName: string; lastName: string; fullName: string };
    appointments: { id: string; startAt: string; doctorName: string; clinicName: string | null; consultationFee: number | null; reason: string | null }[];
    totalAmount: number;
  } | null>(null);
  const [billingSearchError, setBillingSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (patientIdParam) {
      fetch(`/api/receptionist/patients/${patientIdParam}/profile`, {
        credentials: "include",
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((json) => {
          const { patient, billing } = json;
          if (patient && billing) {
            setBillingResult({
              patient: {
                id: patient.id,
                mrn: patient.mrn,
                firstName: patient.firstName,
                lastName: patient.lastName,
                fullName: patient.fullName ?? `${patient.firstName} ${patient.lastName}`.trim(),
              },
              appointments: (billing.completedAppointments ?? []).map((a: { id: string; startAt: string; doctorName: string; consultationFee: number | null }) => ({
                id: a.id,
                startAt: a.startAt,
                doctorName: a.doctorName,
                consultationFee: a.consultationFee,
                clinicName: null,
                reason: null,
              })),
              totalAmount: billing.totalAmount ?? 0,
            });
            router.replace("/receptionist/billing");
          }
        })
        .catch(() => {});
    }
  }, [patientIdParam, router]);

  async function handleBillingSearch() {
    const q = billingSearch.trim();
    if (!q || q.length < 2) {
      setBillingResult(null);
      setBillingSearchError("Enter at least 2 characters to search.");
      return;
    }
    setBillingSearching(true);
    setBillingSearchError(null);
    setBillingResult(null);
    try {
      const searchRes = await fetch(`/api/receptionist/patients/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (searchRes.status === 401) {
        router.push("/auth");
        return;
      }
      const searchJson = await searchRes.json();
      if (!searchRes.ok) {
        setBillingSearchError(searchJson?.error ?? "Search failed.");
        return;
      }
      const patients = searchJson.patients ?? [];
      if (patients.length === 0) {
        setBillingSearchError("No patient found. Try MRN, name, phone, or email.");
        return;
      }
      const patientId = patients[0].id;
      const aptRes = await fetch(`/api/receptionist/patients/${patientId}/completed-appointments`, {
        credentials: "include",
        cache: "no-store",
      });
      if (aptRes.status === 401) {
        router.push("/auth");
        return;
      }
      const aptJson = await aptRes.json();
      if (!aptRes.ok) {
        setBillingSearchError(aptJson?.error ?? "Failed to load appointments.");
        return;
      }
      const appointments = aptJson.appointments ?? [];
      const totalAmount = aptJson.totalAmount ?? appointments.reduce((s: number, a: { consultationFee?: number | null }) => s + (a.consultationFee ?? 0), 0);
      setBillingResult({
        patient: {
          id: patients[0].id,
          mrn: patients[0].mrn,
          firstName: patients[0].firstName,
          lastName: patients[0].lastName,
          fullName: patients[0].fullName ?? `${patients[0].firstName} ${patients[0].lastName}`.trim(),
        },
        appointments,
        totalAmount,
      });
    } catch {
      setBillingSearchError("Network error. Please try again.");
    } finally {
      setBillingSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-slate-400">Search a patient to view their completed appointments.</p>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={billingSearch}
            onChange={(e) => setBillingSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBillingSearch()}
            placeholder="Search by MRN, name, phone, or email"
            className="min-w-[220px] flex-1 max-w-md rounded-xl border border-emerald-500/40 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="button"
            onClick={handleBillingSearch}
            disabled={billingSearching}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {billingSearching ? "Searching..." : "Search"}
          </button>
        </div>
        {billingSearchError && (
          <p className="mt-3 text-sm text-amber-300">{billingSearchError}</p>
        )}
        {billingResult && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-3">
              <p className="text-xs font-medium text-slate-400">Patient</p>
              <p className="mt-1 font-medium text-white">
                {billingResult.patient.fullName}
              </p>
              <p className="text-sm text-slate-400">MRN: {billingResult.patient.mrn}</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-emerald-500/20 bg-slate-950/50">
              <p className="px-4 py-3 text-xs font-medium text-slate-400">Completed appointments</p>
              {billingResult.appointments.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-slate-500">No completed appointments.</p>
              ) : (
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-emerald-500/20">
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Date / Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Doctor</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingResult.appointments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-800/50">
                        <td className="px-4 py-2 text-slate-300">
                          {new Date(a.startAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2 text-slate-200">{a.doctorName}</td>
                        <td className="px-4 py-2 text-right">
                          {a.consultationFee != null ? `$${a.consultationFee.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-emerald-500/30 bg-slate-900/80">
                      <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-white">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-300">
                        ${(billingResult.totalAmount ?? billingResult.appointments.reduce((sum, a) => sum + (a.consultationFee ?? 0), 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
