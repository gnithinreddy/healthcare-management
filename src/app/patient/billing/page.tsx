"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  paidAmount: number;
  balance: number;
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  doctorName: string | null;
  clinicName: string | null;
  createdAt: string;
};

export default function PatientBillingPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    invoices: Invoice[];
    totalDue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/patient/billing", { credentials: "include" });
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData({
        invoices: json.invoices ?? [],
        totalDue: json.totalDue ?? 0,
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

  const invoices = data?.invoices ?? [];
  const totalDue = data?.totalDue ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-slate-400">
          View your invoices and outstanding balance.
        </p>
      </div>

      {totalDue > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">
            Outstanding balance: ${totalDue.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Pay at the clinic reception when you visit.
          </p>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No invoices yet.</p>
          <p className="mt-2 text-xs text-slate-500">
            Invoices are created after your visits are completed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">
                    Invoice #{inv.invoiceNumber}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {inv.doctorName && `${inv.doctorName}`}
                    {inv.clinicName && ` @ ${inv.clinicName}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    inv.status === "PAID"
                      ? "bg-emerald-500/30 text-emerald-200"
                      : inv.status === "PARTIAL"
                        ? "bg-amber-500/30 text-amber-200"
                        : "bg-red-500/30 text-red-200"
                  }`}
                >
                  {formatStatus(inv.status)}
                </span>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                {inv.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-300">
                      {item.description} × {item.quantity}
                    </span>
                    <span className="text-slate-200">
                      ${item.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-700 pt-2 text-sm font-medium">
                  <span>Total</span>
                  <span>${inv.total.toFixed(2)}</span>
                </div>
                {inv.paidAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-300">
                    <span>Paid</span>
                    <span>${inv.paidAmount.toFixed(2)}</span>
                  </div>
                )}
                {inv.balance > 0 && (
                  <div className="flex justify-between text-sm font-medium text-amber-200">
                    <span>Balance due</span>
                    <span>${inv.balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
