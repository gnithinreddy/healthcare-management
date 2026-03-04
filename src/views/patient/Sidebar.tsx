"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/patient", label: "Overview" },
  { href: "/patient/appointments", label: "Appointments" },
  { href: "/patient/prescriptions", label: "Prescriptions" },
  { href: "/patient/billing", label: "Billing" },
  { href: "/patient/profile", label: "Profile" },
] as const;

export default function PatientSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-emerald-500/20 bg-slate-950/80 backdrop-blur">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-bold">
          HC
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-300">
            Patient Portal
          </p>
          <p className="text-xs text-slate-300">HealthCare Suite</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              pathname === item.href ||
              (item.href !== "/patient" && pathname.startsWith(item.href))
                ? "bg-emerald-500/15 text-emerald-200"
                : "text-slate-200 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-emerald-500/20 text-xs text-slate-400">
        <p>Your health, your data</p>
      </div>
    </aside>
  );
}
