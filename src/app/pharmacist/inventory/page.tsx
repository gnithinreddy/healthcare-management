"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type InventoryItem = {
  id: string;
  pharmacyName: string;
  drugName: string;
  quantity: number;
  expiryDate: string | null;
  isLowStock: boolean;
  isExpired: boolean;
};

export default function PharmacistInventoryPage() {
  const [data, setData] = useState<{
    inventory: InventoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<string>("");
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
      setData({ inventory: json.inventory ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateQty(id: string, newQty: number) {
    try {
      const res = await fetch(`/api/pharmacist/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      await loadData();
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
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

  const inventory = data?.inventory ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Inventory</h1>
        <p className="mt-1 text-sm text-slate-400">
          View and adjust stock levels for your pharmacy.
        </p>
      </div>

      {inventory.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No inventory items on file.</p>
          <p className="mt-2 text-xs text-slate-500">
            Contact admin to add inventory to your pharmacy.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-emerald-500/20 bg-slate-900/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-500/20 text-left">
                <th className="p-4 font-medium text-emerald-200">Drug</th>
                <th className="p-4 font-medium text-emerald-200">Quantity</th>
                <th className="p-4 font-medium text-emerald-200">Expiry</th>
                <th className="p-4 font-medium text-emerald-200">Status</th>
                <th className="p-4 font-medium text-emerald-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-slate-800/50 last:border-0"
                >
                  <td className="p-4 font-medium text-white">{i.drugName}</td>
                  <td className="p-4">
                    {editingId === i.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          className="w-20 rounded-xl border border-emerald-500/40 bg-slate-950 px-2 py-1 text-sm text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQty(i.id, parseInt(editVal, 10) || 0)
                          }
                          className="rounded-full bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                          }}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className={
                          i.isLowStock ? "text-amber-200" : "text-slate-200"
                        }
                      >
                        {i.quantity}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400">
                    {i.expiryDate
                      ? new Date(i.expiryDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-4">
                    {i.isExpired ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-200">
                        Expired
                      </span>
                    ) : i.isLowStock ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                        Low stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {editingId !== i.id && !i.isExpired && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(i.id);
                          setEditVal(String(i.quantity));
                        }}
                        className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        Adjust
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
