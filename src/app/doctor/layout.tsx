"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import DoctorSidebar from "@/views/doctor/Sidebar";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl" />

      <DoctorSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-emerald-500/20 bg-slate-950/80 px-4 py-3 backdrop-blur md:px-6">
          <div>
            <p className="text-xs text-slate-300 uppercase tracking-[0.15em]">
              Clinic
            </p>
            <h1 className="text-base font-semibold text-white md:text-lg">
              Doctor portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-emerald-500/50 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
            >
              Back to site
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
