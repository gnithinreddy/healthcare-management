"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Prescription = {
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
};

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      setPrescriptions(json.prescriptions ?? []);
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
    s
      .toLowerCase()
      .replace("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Prescriptions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your prescription history and current medications.
        </p>
      </div>

      <div className="space-y-4">
        {prescriptions.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
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
                  {formatStatus(p.status)}
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
    </div>
  );
}
