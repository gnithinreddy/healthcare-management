"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatStatus } from "@/lib/utils";

type DashboardData = {
  pharmacist: { id: string; firstName: string; lastName: string; licenseNumber: string | null };
  pharmacy: { id: string; name: string; phone: string | null; clinicName: string | null };
  inventory: {
    id: string;
    pharmacyName: string;
    drugName: string;
    quantity: number;
    expiryDate: string | null;
    isLowStock: boolean;
    isExpired: boolean;
  }[];
  dispenses: {
    id: string;
    status: string;
    createdAt: string;
    patientName: string;
    doctorName: string;
    pharmacistName: string | null;
    drugs: { drugName: string; dosage: string | null; frequency: string | null; instructions: string | null }[];
  }[];
  stats: {
    inventoryCount: number;
    lowStockCount: number;
    expiredCount: number;
    pendingDispenses: number;
  };
};

export default function PharmacistDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const { pharmacist, pharmacy, inventory, dispenses, stats } = data;
  const fullName = `${pharmacist.firstName} ${pharmacist.lastName}`.trim();

  const pendingDispenses = dispenses.filter((d) => d.status === "IN_REVIEW");
  const lowStockItems = inventory.filter((i) => i.isLowStock && !i.isExpired);
  const expiredItems = inventory.filter((i) => i.isExpired);

  return (
    <div className="space-y-8">
      {/* Attention needed */}
      {(stats.pendingDispenses > 0 || stats.expiredCount > 0) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h3 className="text-sm font-semibold text-amber-200">Attention needed</h3>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {stats.pendingDispenses > 0 && (
              <Link
                href="/pharmacist/dispenses?status=IN_REVIEW"
                className="text-amber-300 hover:underline"
              >
                {stats.pendingDispenses} pending dispense{stats.pendingDispenses !== 1 ? "s" : ""} to review
              </Link>
            )}
            {stats.expiredCount > 0 && (
              <Link
                href="/pharmacist/inventory"
                className="text-amber-300 hover:underline"
              >
                {stats.expiredCount} expired item{stats.expiredCount !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Inventory</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">{stats.inventoryCount}</p>
          <p className="text-xs text-slate-500">items in stock</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">{stats.pendingDispenses}</p>
          <p className="text-xs text-slate-500">to dispense</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Low stock</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">{stats.lowStockCount}</p>
          <p className="text-xs text-slate-500">need reorder</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400">Expired</p>
          <p className="mt-1 text-2xl font-bold text-red-200">{stats.expiredCount}</p>
          <p className="text-xs text-slate-500">items</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/50 p-6 shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {fullName || "Pharmacist"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {pharmacy.name}
              {pharmacy.clinicName && ` • ${pharmacy.clinicName}`}
              {pharmacist.licenseNumber && ` • License: ${pharmacist.licenseNumber}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pharmacist/dispenses"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              View dispenses
            </Link>
            <Link
              href="/pharmacist/inventory"
              className="rounded-full border border-emerald-500/50 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/10"
            >
              View inventory
            </Link>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Pending dispenses
        </h2>
        {pendingDispenses.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">No pending dispenses.</p>
            <Link
              href="/pharmacist/dispenses"
              className="mt-2 inline-block text-sm text-emerald-300 hover:underline"
            >
              View all dispenses
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDispenses
              .slice(0, 5)
              .map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {d.patientName} — {d.doctorName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.drugs.map((x) => x.drugName).join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-medium text-amber-200">
                      {formatStatus(d.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/pharmacist/dispenses?id=${d.id}`}
                      className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-emerald-200">
          Low stock items
        </h2>
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-slate-500">No low stock items.</p>
        ) : (
          <div className="space-y-2">
            {lowStockItems
              .slice(0, 5)
              .map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-200">
                    {i.drugName}
                  </span>
                  <span className="text-xs text-amber-200">
                    {i.quantity} left
                  </span>
                </div>
              ))}
            <Link
              href="/pharmacist/inventory"
              className="inline-block text-sm text-emerald-300 hover:underline"
            >
              View full inventory
            </Link>
          </div>
        )}
      </section>

      {expiredItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-red-200">
            Expired items
          </h2>
          <div className="space-y-2">
            {expiredItems.slice(0, 5).map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-200">{i.drugName}</span>
                <span className="text-xs text-red-300">
                  Expired {i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
            {expiredItems.length > 5 && (
              <p className="text-xs text-slate-500">+{expiredItems.length - 5} more expired</p>
            )}
            <Link
              href="/pharmacist/inventory"
              className="inline-block text-sm text-emerald-300 hover:underline"
            >
              View full inventory
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
