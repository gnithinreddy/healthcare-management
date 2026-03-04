import type { ReactNode } from "react";
import Link from "next/link";
import AdminSidebar from "@/views/admin/Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-emerald-500/20 bg-slate-950/80 px-4 py-3 backdrop-blur md:px-6">
          <div>
            <p className="text-xs text-slate-300 uppercase tracking-[0.15em]">
              Admin
            </p>
            <h1 className="text-base font-semibold text-white md:text-lg">
              Hospital overview
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-emerald-500/50 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
            >
              Back to site
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"
            >
              Sign off
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-6 md:py-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}

