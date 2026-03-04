"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

const roleFilters = [
  { key: "ALL", label: "All users" },
  { key: "PATIENT", label: "Patients" },
  { key: "DOCTOR", label: "Doctors" },
  { key: "PHARMACIST", label: "Pharmacists" },
  { key: "RECEPTIONIST", label: "Receptionists" },
  { key: "ADMIN", label: "Admins" },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") ?? "ALL";
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin/users")) {
      setUsersOpen(true);
    }
  }, [pathname]);

  const currentRole =
    roleFilters.find((r) => r.key === roleParam)?.key ?? "ALL";

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-emerald-500/20 bg-slate-950/80 backdrop-blur">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-bold">
          HC
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-300">
            Admin Dashboard
          </p>
          <p className="text-xs text-slate-300">HealthCare Suite</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        <NavItem
          href="/admin"
          label="Overview"
          active={pathname === "/admin"}
        />

        <div>
          <button
            type="button"
            onClick={() => setUsersOpen((open) => !open)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${
              pathname.startsWith("/admin/users")
                ? "bg-emerald-500/15 text-emerald-200"
                : "text-slate-200 hover:bg-slate-900"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Users
            </span>
            <span className="text-[0.65rem] text-slate-400">
              {usersOpen ? "▲" : "▼"}
            </span>
          </button>

          {usersOpen && (
            <div className="mt-1 space-y-0.5 pl-7 text-xs">
              {roleFilters.map((role) => {
                const isActive =
                  pathname.startsWith("/admin/users") &&
                  currentRole === role.key;
                const href =
                  role.key === "ALL"
                    ? "/admin/users"
                    : `/admin/users?role=${role.key}`;

                return (
                  <Link
                    key={role.key}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                    <span>{role.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <NavItem
          href="/admin/appointments"
          label="Appointments"
          active={pathname.startsWith("/admin/appointments")}
        />
        <NavItem
          href="/admin/pharmacy"
          label="Pharmacy & Inventory"
          active={pathname.startsWith("/admin/pharmacy")}
        />
      </nav>

      <div className="px-4 py-4 border-t border-emerald-500/20 text-xs text-slate-400">
        <p>Signed in as</p>
        <p className="font-medium text-emerald-200">Admin</p>
      </div>
    </aside>
  );
}

type NavItemProps = {
  href: string;
  label: string;
  active: boolean;
};

function NavItem({ href, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        active
          ? "bg-emerald-500/15 text-emerald-200"
          : "text-slate-200 hover:bg-slate-900"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {label}
    </Link>
  );
}
