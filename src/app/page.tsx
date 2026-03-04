 "use client";

import Link from "next/link";
import { useState } from "react";

const sections = [
  {
    id: "appointments",
    title: "Online Appointments",
    description:
      "Patients can book, reschedule, and cancel appointments in real time. Doctors manage their schedules with a clear, conflict-free calendar.",
  },
  {
    id: "records",
    title: "Electronic Medical Records",
    description:
      "Secure, structured medical records with visit history, diagnoses, prescriptions, and lab results—accessible to authorized staff only.",
  },
  {
    id: "portals",
    title: "Patient & Doctor Portals",
    description:
      "Patients track their health, doctors manage their daily workload, and admins get a full picture of operations from a single dashboard.",
  },
  {
    id: "pharmacy",
    title: "Pharmacy & Inventory",
    description:
      "Track medicine stock, manage pharmacy dispensing, and get smart low-stock alerts for critical medicines.",
  },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState("appointments");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top gradient background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent blur-3xl" />

      {/* Navbar */}
      <header className="border-b border-emerald-500/20 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold">
              HC
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-emerald-400">
                HealthCare Suite
              </p>
              <p className="text-xs text-slate-300">
                Appointments • EMR • Pharmacy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="rounded-full bg-emerald-500 px-5 py-1.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
            >
              Login / Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero + overview */}
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:items-center">
        {/* Hero text */}
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950/60 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            End-to-end hospital management, one platform
          </span>

          <h1 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
            A modern{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              healthcare system
            </span>{" "}
            for appointments, records, and pharmacy.
          </h1>

          <p className="max-w-xl text-sm text-slate-300 md:text-base">
            Manage patients, doctors, pharmacy, and administration from a single
            secure platform. Designed for real clinics and hospitals, ready to
            demo on your portfolio.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/auth"
              className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
            >
              Login / Sign up
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
            >
              Explore features
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-slate-300 md:grid-cols-3 md:text-sm">
            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-3">
              <p className="text-lg font-semibold text-emerald-300">4+</p>
              <p>Portals – patient, doctor, admin, pharmacy</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-3">
              <p className="text-lg font-semibold text-emerald-300">100%</p>
              <p>Local hosting with secure data control</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-3">
              <p className="text-lg font-semibold text-emerald-300">24/7</p>
              <p>Access to appointments & medical records</p>
            </div>
          </div>
        </div>

        {/* Interactive feature panel */}
        <div className="flex-1">
          <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-4 shadow-xl shadow-emerald-500/20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Explore modules
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/70 p-4">
              {sections.map((section) =>
                section.id === activeSection ? (
                  <div key={section.id} className="space-y-2 text-sm">
                    <h3 className="text-base font-semibold text-emerald-200">
                      {section.title}
                    </h3>
                    <p className="text-slate-300">{section.description}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
                      {section.id === "appointments" && (
                        <>
                          <li>Smart time slots and conflict prevention</li>
                          <li>Automatic status tracking for each visit</li>
                          <li>Clear day and week views for doctors</li>
                        </>
                      )}
                      {section.id === "records" && (
                        <>
                          <li>Complete visit timeline for each patient</li>
                          <li>Diagnoses, vitals, prescriptions, and labs</li>
                          <li>Role-based access to sensitive data</li>
                        </>
                      )}
                      {section.id === "portals" && (
                        <>
                          <li>Separate dashboards for patients and doctors</li>
                          <li>Admins control staff, departments, and roles</li>
                          <li>Centralized view of hospital performance</li>
                        </>
                      )}
                      {section.id === "pharmacy" && (
                        <>
                          <li>Real-time stock updates in pharmacy</li>
                          <li>Low-stock alerts for critical medicines</li>
                          <li>Dispense tracking and prescription flow</li>
                        </>
                      )}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section
        id="features"
        className="border-t border-emerald-500/20 bg-slate-950/90 py-10"
      >
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold text-white md:text-2xl">
            Everything your{" "}
            <span className="text-emerald-300">healthcare system</span> needs
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Built as a full-stack project with authentication, data models, and
            production-ready UI — perfect to showcase on LinkedIn.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-4 text-sm">
              <h3 className="mb-1 text-emerald-200 font-semibold">
                Secure authentication
              </h3>
              <p className="text-slate-300">
                Role-based access for patients, doctors, pharmacists, and
                admins. Protect sensitive medical data with modern auth.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-4 text-sm">
              <h3 className="mb-1 text-emerald-200 font-semibold">
                Clean, modern UI
              </h3>
              <p className="text-slate-300">
                Green, white, and black theme with responsive layouts that look
                great on desktop, tablet, and mobile.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-4 text-sm">
              <h3 className="mb-1 text-emerald-200 font-semibold">
                Designed for developers
              </h3>
              <p className="text-slate-300">
                Next.js, TypeScript, Tailwind, and a relational database layer,
                ready to extend with real-world logic.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
