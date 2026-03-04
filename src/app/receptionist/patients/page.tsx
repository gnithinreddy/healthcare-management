"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Patient = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  dob: string | null;
};

type ProfileAppointment = {
  id: string;
  startAt: string;
  endAt?: string;
  status: string;
  reason: string | null;
  doctorName: string;
  clinicName: string | null;
};

type BillingAppointment = {
  id: string;
  startAt: string;
  doctorName: string;
  consultationFee: number | null;
};

type PatientProfile = {
  patient: {
    id: string;
    mrn: string;
    status: string;
    fullName: string;
    dob: string | null;
    sex: string | null;
    phone: string | null;
    email: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  upcomingAppointments: ProfileAppointment[];
  pastAppointments: ProfileAppointment[];
  billing: {
    completedAppointments: BillingAppointment[];
    totalAmount: number;
  };
};

export default function ReceptionistPatientsPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const router = useRouter();

  const doSearch = useCallback(async () => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setSelectedPatientId(null);
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedPatientId(null);
    setProfile(null);
    try {
      const res = await fetch(
        `/api/receptionist/patients/search?q=${encodeURIComponent(q)}`
      );
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Search failed");
      setResults(json.patients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search, router]);

  useEffect(() => {
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [doSearch]);

  function closeProfileModal() {
    setSelectedPatientId(null);
    setProfile(null);
  }

  async function handleSelectPatient(patientId: string) {
    setSelectedPatientId(patientId);
    setProfileLoading(true);
    setProfile(null);
    try {
      const res = await fetch(`/api/receptionist/patients/${patientId}/profile`);
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load profile");
      setProfile(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }

  const formatStatus = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Patients</h1>
        <p className="mt-1 text-sm text-slate-400">
          Search by name, MRN, phone, or email. Click a patient to view full profile.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type name, MRN, phone, or email..."
          className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none ring-emerald-500/40 focus:ring"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {!loading && search.trim().length >= 2 && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-slate-500">No patients found.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPatient(p.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedPatientId === p.id
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-emerald-500/20 bg-slate-900/50 hover:border-emerald-500/40 hover:bg-slate-900/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{p.fullName}</p>
                    <p className="mt-1 text-sm text-slate-400">MRN: {p.mrn}</p>
                    {(p.phone || p.email) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {p.phone && `${p.phone}`}
                        {p.phone && p.email && " • "}
                        {p.email && p.email}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/receptionist/appointments?book=1&patientId=${p.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Book
                  </Link>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Profile modal */}
      {selectedPatientId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeProfileModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {profileLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="mt-3 text-sm text-slate-400">Loading profile...</p>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-emerald-200">Patient profile</h2>
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="rounded-full border border-slate-500/50 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                  >
                    ×
                  </button>
                </div>

                {/* Details */}
                <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-200">Details</h3>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-white">{profile.patient.fullName}</dd></div>
                    <div><dt className="text-slate-500">MRN</dt><dd className="text-slate-200">{profile.patient.mrn}</dd></div>
                    <div><dt className="text-slate-500">Status</dt><dd className="text-slate-200">{profile.patient.status}</dd></div>
                    {profile.patient.dob && <div><dt className="text-slate-500">DOB</dt><dd className="text-slate-200">{new Date(profile.patient.dob).toLocaleDateString()}</dd></div>}
                    {profile.patient.sex && <div><dt className="text-slate-500">Sex</dt><dd className="text-slate-200">{profile.patient.sex}</dd></div>}
                    {profile.patient.phone && <div><dt className="text-slate-500">Phone</dt><dd className="text-slate-200">{profile.patient.phone}</dd></div>}
                    {profile.patient.email && <div><dt className="text-slate-500">Email</dt><dd className="text-slate-200">{profile.patient.email}</dd></div>}
                    {(profile.patient.address1 || profile.patient.city) && (
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Address</dt>
                        <dd className="text-slate-200">
                          {[profile.patient.address1, profile.patient.address2, [profile.patient.city, profile.patient.state, profile.patient.zip].filter(Boolean).join(", ")].filter(Boolean).join(" • ")}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Upcoming */}
                <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-200">Upcoming appointments</h3>
                  {profile.upcomingAppointments.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">None scheduled.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {profile.upcomingAppointments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
                          <div>
                            <p className="text-slate-200">{new Date(a.startAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                            <p className="text-xs text-slate-500">{a.doctorName}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${a.status === "CONFIRMED" ? "bg-emerald-500/30 text-emerald-200" : "bg-amber-500/30 text-amber-200"}`}>{formatStatus(a.status)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past */}
                <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-200">Past appointments</h3>
                  {profile.pastAppointments.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">None.</p>
                  ) : (
                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                      {profile.pastAppointments.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
                          <div>
                            <p className="text-slate-200">{new Date(a.startAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                            <p className="text-xs text-slate-500">{a.doctorName}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            a.status === "COMPLETED" ? "bg-emerald-500/30 text-emerald-200" :
                            a.status === "CANCELLED" || a.status === "NO_SHOW" ? "bg-slate-600/50 text-slate-400" :
                            "bg-slate-500/30 text-slate-300"
                          }`}>{formatStatus(a.status)}</span>
                        </div>
                      ))}
                      {profile.pastAppointments.length > 5 && (
                        <p className="text-xs text-slate-500">+{profile.pastAppointments.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Billing */}
                <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-200">Billing</h3>
                  {profile.billing.completedAppointments.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No completed visits yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {profile.billing.completedAppointments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
                          <span className="text-slate-200">{new Date(a.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} — {a.doctorName}</span>
                          <span className="font-medium text-emerald-300">{a.consultationFee != null ? `$${a.consultationFee.toFixed(2)}` : "—"}</span>
                        </div>
                      ))}
                      <div className="mt-3 flex justify-between border-t border-slate-700 pt-3 text-sm font-semibold">
                        <span className="text-white">Total</span>
                        <span className="text-emerald-300">${(profile.billing.totalAmount ?? 0).toFixed(2)}</span>
                      </div>
                      <Link
                        href={`/receptionist/billing?patientId=${profile.patient.id}`}
                        className="mt-2 inline-block text-xs text-emerald-400 hover:underline"
                      >
                        View full billing →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {search.trim().length < 2 && !loading && (
        <p className="text-sm text-slate-500">
          Enter at least 2 characters to search.
        </p>
      )}
    </div>
  );
}
