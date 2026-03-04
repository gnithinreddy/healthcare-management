"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatStatus } from "@/lib/utils";

type Dispense = {
  id: string;
  status: string;
  createdAt: string;
  patientName: string;
  doctorName: string;
  pharmacistName: string | null;
  drugs: {
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    instructions: string | null;
  }[];
};

export default function PharmacistDispensesPage() {
  const [data, setData] = useState<{ dispenses: Dispense[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/pharmacist/dashboard");
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData({ dispenses: json.dispenses ?? [] });
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
      const res = await fetch(`/api/pharmacist/dispenses/${id}`, {
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

  const dispenses = data?.dispenses ?? [];
  const pending = dispenses.filter((d) => d.status === "IN_REVIEW");
  const completed = dispenses.filter((d) => d.status !== "IN_REVIEW");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Dispenses</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review and process prescription dispenses.
        </p>
      </div>

      {dispenses.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No dispense records yet.</p>
          <p className="mt-2 text-xs text-slate-500">
            Prescriptions sent to your pharmacy will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-emerald-200">
                Pending ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">
                          {d.patientName} — {d.doctorName}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          {new Date(d.createdAt).toLocaleString()}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-400">
                          {d.drugs.map((drug, idx) => (
                            <li key={idx}>
                              {drug.drugName}
                              {drug.dosage && ` — ${drug.dosage}`}
                              {drug.frequency && `, ${drug.frequency}`}
                              {drug.instructions && `: ${drug.instructions}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-medium text-amber-200">
                          {formatStatus(d.status)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(d.id, "DISPENSED")}
                            disabled={updatingId === d.id}
                            className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                          >
                            {updatingId === d.id ? "..." : "Dispensed"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(d.id, "OUT_OF_STOCK")
                            }
                            disabled={updatingId === d.id}
                            className="rounded-full border border-red-500/50 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Out of stock
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-emerald-200">
                Completed / Other
              </h2>
              <div className="space-y-2">
                {completed.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {d.patientName} • {d.doctorName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.drugs.map((x) => x.drugName).join(", ")} —{" "}
                        {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.status === "DISPENSED"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {formatStatus(d.status)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
