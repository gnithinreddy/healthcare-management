"use client";

import { useCallback, useEffect, useState } from "react";

type Pharmacy = {
  id: string;
  name: string;
  phone: string | null;
  licenseNumber: string | null;
  clinicName: string | null;
  pharmacistCount: number;
  itemCount: number;
};

type InventoryItem = {
  id: string;
  pharmacyName: string;
  drugName: string;
  quantity: number;
  expiryDate: string | null;
  isLowStock: boolean;
  isExpired: boolean;
};

type Dispense = {
  id: string;
  pharmacyName: string;
  status: string;
  createdAt: string;
  patientName: string;
  pharmacistName: string | null;
};

export default function AdminPharmacyPage() {
  const [view, setView] = useState<"pharmacies" | "inventory" | "dispenses">("pharmacies");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dispenses, setDispenses] = useState<Dispense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [phRes, invRes, dispRes] = await Promise.all([
        fetch("/api/admin/pharmacy?view=pharmacies"),
        fetch("/api/admin/pharmacy?view=inventory"),
        fetch("/api/admin/pharmacy?view=dispenses"),
      ]);
      const phJson = await phRes.json();
      const invJson = await invRes.json();
      const dispJson = await dispRes.json();
      if (phRes.ok) setPharmacies(phJson.pharmacies ?? []);
      if (invRes.ok) setInventory(invJson.inventory ?? []);
      if (dispRes.ok) setDispenses(dispJson.dispenses ?? []);
      if (!phRes.ok) throw new Error(phJson?.error ?? "Failed to load");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddInventory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    const form = new FormData(e.currentTarget);
    const pharmacyId = form.get("pharmacyId") as string;
    const drugName = (form.get("drugName") as string)?.trim();
    const quantity = parseInt(form.get("quantity") as string, 10) || 0;
    const expiryDate = (form.get("expiryDate") as string) || undefined;

    if (!pharmacyId || !drugName) {
      setAddError("Pharmacy and drug name are required.");
      setAddLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/pharmacy/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId, drugName, quantity, expiryDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to add");
      await loadData();
      setAddModalOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleUpdateQty(id: string, newQty: number) {
    try {
      const res = await fetch(`/api/admin/pharmacy/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await loadData();
      setEditingId(null);
    } catch {
      setEditingId(null);
    }
  }

  const lowStockCount = inventory.filter((i) => i.isLowStock).length;
  const expiredCount = inventory.filter((i) => i.isExpired).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">
          Pharmacy & Inventory
        </h1>
        <p className="text-xs text-slate-400">
          Manage pharmacies, drug inventory, and dispensing records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pharmacies", "inventory", "dispenses"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-[0.75rem] font-medium ${
              view === v
                ? "bg-emerald-500 text-slate-950"
                : "border border-emerald-500/40 text-slate-300 hover:bg-emerald-500/10"
            }`}
          >
            {v === "pharmacies"
              ? "Pharmacies"
              : v === "inventory"
                ? `Inventory${lowStockCount > 0 ? ` (${lowStockCount} low)` : ""}`
                : "Dispenses"}
          </button>
        ))}
      </div>

      {view === "pharmacies" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4">
          <h2 className="mb-3 text-sm font-semibold text-emerald-200">
            Pharmacies
          </h2>
          {loading ? (
            <p className="py-4 text-slate-500">Loading...</p>
          ) : error ? (
            <p className="py-4 text-red-400">{error}</p>
          ) : pharmacies.length === 0 ? (
            <p className="py-4 text-slate-500">No pharmacies.</p>
          ) : (
            <div className="space-y-2">
              {pharmacies.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-xs"
                >
                  <div>
                    <span className="font-medium text-emerald-200">{p.name}</span>
                    {p.clinicName && (
                      <span className="ml-2 text-slate-500">
                        @ {p.clinicName}
                      </span>
                    )}
                    {p.phone && (
                      <span className="ml-2 text-slate-400">{p.phone}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-slate-400">
                    <span>{p.pharmacistCount} pharmacist(s)</span>
                    <span>{p.itemCount} inventory item(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "inventory" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-200">
              Inventory
            </h2>
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(true);
                setAddError(null);
              }}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.75rem] font-semibold text-slate-950 hover:bg-emerald-400"
            >
              + Add item
            </button>
          </div>
          {lowStockCount > 0 && (
            <p className="mb-2 text-[0.7rem] text-amber-300">
              ⚠ {lowStockCount} item(s) low stock (&lt;10)
            </p>
          )}
          {expiredCount > 0 && (
            <p className="mb-2 text-[0.7rem] text-red-400">
              ⚠ {expiredCount} item(s) expired
            </p>
          )}
          {loading ? (
            <p className="py-4 text-slate-500">Loading...</p>
          ) : error ? (
            <p className="py-4 text-red-400">{error}</p>
          ) : inventory.length === 0 ? (
            <p className="py-4 text-slate-500">No inventory items. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-4 text-left font-medium">Drug</th>
                    <th className="py-2 pr-4 text-left font-medium">Pharmacy</th>
                    <th className="py-2 pr-4 text-left font-medium">Quantity</th>
                    <th className="py-2 pr-4 text-left font-medium">Expiry</th>
                    <th className="py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((i) => (
                    <tr
                      key={i.id}
                      className={`border-t border-slate-900/80 ${
                        i.isExpired ? "bg-red-500/5" : i.isLowStock ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="py-2 pr-4 font-medium">{i.drugName}</td>
                      <td className="py-2 pr-4 text-slate-400">{i.pharmacyName}</td>
                      <td className="py-2 pr-4">
                        {editingId === i.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const val = e.currentTarget.querySelector("input")?.value ?? "0";
                              const q = parseInt(val, 10);
                              handleUpdateQty(i.id, q);
                            }}
                            className="flex gap-1"
                          >
                            <input
                              type="number"
                              min={0}
                              defaultValue={i.quantity}
                              className="w-16 rounded border border-emerald-500/40 bg-slate-950 px-2 py-0.5 text-white"
                            />
                            <button
                              type="submit"
                              className="rounded bg-emerald-500 px-2 py-0.5 text-[0.65rem] text-slate-950"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-slate-400"
                            >
                              ✕
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(i.id)}
                            className="hover:underline"
                          >
                            {i.quantity}
                          </button>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">
                        {i.expiryDate
                          ? new Date(i.expiryDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-2">
                        {i.isExpired ? (
                          <span className="text-[0.65rem] text-red-400">Expired</span>
                        ) : i.isLowStock ? (
                          <span className="text-[0.65rem] text-amber-300">Low stock</span>
                        ) : (
                          <span className="text-[0.65rem] text-emerald-300">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === "dispenses" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4">
          <h2 className="mb-3 text-sm font-semibold text-emerald-200">
            Recent dispense records
          </h2>
          {loading ? (
            <p className="py-4 text-slate-500">Loading...</p>
          ) : error ? (
            <p className="py-4 text-red-400">{error}</p>
          ) : dispenses.length === 0 ? (
            <p className="py-4 text-slate-500">No dispense records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-4 text-left font-medium">Patient</th>
                    <th className="py-2 pr-4 text-left font-medium">Pharmacy</th>
                    <th className="py-2 pr-4 text-left font-medium">Pharmacist</th>
                    <th className="py-2 pr-4 text-left font-medium">Status</th>
                    <th className="py-2 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dispenses.map((d) => (
                    <tr key={d.id} className="border-t border-slate-900/80">
                      <td className="py-2 pr-4">{d.patientName}</td>
                      <td className="py-2 pr-4 text-slate-400">{d.pharmacyName}</td>
                      <td className="py-2 pr-4 text-slate-400">
                        {d.pharmacistName ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="capitalize text-emerald-300">
                          {d.status.toLowerCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add inventory modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-4 w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-emerald-200">
                Add inventory item
              </h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddInventory} className="space-y-3 text-xs">
              {addError && <p className="text-red-400">{addError}</p>}
              <div className="space-y-1">
                <label className="text-[0.7rem] font-medium text-slate-200">
                  Pharmacy *
                </label>
                <select
                  name="pharmacyId"
                  required
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                >
                  <option value="">Select pharmacy</option>
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[0.7rem] font-medium text-slate-200">
                  Drug name *
                </label>
                <input
                  name="drugName"
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[0.7rem] font-medium text-slate-200">
                  Quantity
                </label>
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[0.7rem] font-medium text-slate-200">
                  Expiry date
                </label>
                <input
                  name="expiryDate"
                  type="date"
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {addLoading ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
