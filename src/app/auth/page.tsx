"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const router = useRouter();

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string | null)?.trim();
    const password = (formData.get("password") as string | null) ?? "";

    if (!email || !password) {
      setLoginError("Please enter email and password.");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoginError(data?.error ?? "Login failed. Please try again.");
        return;
      }

      const role = data?.user?.role as string | undefined;

      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "PATIENT") {
        router.push("/patient");
      } else if (role === "PHARMACIST") {
        router.push("/pharmacist");
      } else if (role === "DOCTOR") {
        router.push("/doctor");
      } else if (role === "RECEPTIONIST") {
        router.push("/receptionist");
      } else {
        router.push("/");
      }
    } catch (err) {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string | null)?.trim();
    const lastName = (formData.get("lastName") as string | null)?.trim();
    const email = (formData.get("email") as string | null)?.trim();
    const password = formData.get("password") as string | null;
    const dateOfBirth = formData.get("dateOfBirth") as string | null;
    const gender = formData.get("gender") as string | null;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !dateOfBirth ||
      !gender
    ) {
      setSignupError("All fields are required.");
      setSignupLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          dateOfBirth,
          gender,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSignupError(data?.error ?? "Sign up failed. Please try again.");
        return;
      }

      // After successful signup, switch back to login tab.
      setMode("login");
    } catch (err) {
      setSignupError("Something went wrong. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 text-white px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent blur-3xl" />

      <div className="w-full max-w-4xl rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl shadow-emerald-500/25 backdrop-blur-2xl md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-bold">
              HC
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-emerald-300">
                HealthCare Suite
              </p>
              <p className="text-xs text-slate-300">
                One secure account for patients, doctors, and staff.
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-emerald-200 hover:text-emerald-100 underline-offset-4 hover:underline"
          >
            ← Back to home
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Credentials reference block - left side */}
          <div className="order-1 rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-5 backdrop-blur-2xl">
            <h2 className="text-sm font-semibold text-emerald-200 mb-3">
              Demo credentials
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Use these to log in and explore each portal.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/30">
                    <th className="py-2 pr-3 text-left font-medium text-emerald-200">Role</th>
                    <th className="py-2 pr-3 text-left font-medium text-emerald-200">Email</th>
                    <th className="py-2 text-left font-medium text-emerald-200">Password</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 pr-3">Admin</td>
                    <td className="py-2 pr-3 font-mono text-slate-200">admin@gmail.com</td>
                    <td className="py-2 font-mono text-slate-200">admin123</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 pr-3">Patient</td>
                    <td className="py-2 pr-3 font-mono text-slate-200">john.doe@example.com</td>
                    <td className="py-2 font-mono text-slate-200">Patient123!</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 pr-3">Doctor</td>
                    <td className="py-2 pr-3 font-mono text-slate-200">dr.william.harris@example.com</td>
                    <td className="py-2 font-mono text-slate-200">Doctor123!</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 pr-3">Pharmacist</td>
                    <td className="py-2 pr-3 font-mono text-slate-200">pharmacy.evan.scott@example.com</td>
                    <td className="py-2 font-mono text-slate-200">Pharma123!</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">Receptionist</td>
                    <td className="py-2 pr-3 font-mono text-slate-200">reception.liam.young@example.com</td>
                    <td className="py-2 font-mono text-slate-200">Reception123!</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form card with glass + slider - right side */}
          <div className="order-2 rounded-2xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-2xl shadow-lg shadow-emerald-500/30">
            {/* Slider toggle */}
            <div className="mb-5">
              <div className="relative flex rounded-full bg-slate-900/70 p-1">
                <div
                  className={`absolute inset-y-1 w-1/2 rounded-full bg-emerald-500/90 shadow-md shadow-emerald-500/40 transition-transform duration-500 ${
                    mode === "login" ? "translate-x-0" : "translate-x-full"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`relative z-10 flex-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "login"
                      ? "text-slate-950"
                      : "text-slate-200 hover:text-white"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`relative z-10 flex-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "signup"
                      ? "text-slate-950"
                      : "text-slate-200 hover:text-white"
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            {/* Sliding forms */}
            <div className="relative h-[340px] overflow-hidden">
              <div
                className={`absolute inset-0 flex w-[200%] transition-transform duration-500 ${
                  mode === "login" ? "translate-x-0" : "-translate-x-1/2"
                }`}
              >
                {/* Login side */}
                <div className="flex w-1/2 flex-col pr-4">
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-lg font-semibold text-white md:text-xl">
                        Welcome back
                      </h1>
                      <p className="mt-1 text-xs text-slate-300 md:text-sm">
                        Enter your email and password to access your healthcare
                        dashboard.
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleLoginSubmit}>
                      <div className="space-y-1">
                        <label
                          htmlFor="login-email"
                          className="text-xs font-medium text-slate-200"
                        >
                          Email
                        </label>
                        <input
                          id="login-email"
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="login-password"
                          className="text-xs font-medium text-slate-200"
                        >
                          Password
                        </label>
                        <input
                          id="login-password"
                          type="password"
                          name="password"
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border border-emerald-500/60 bg-slate-900 text-emerald-500"
                          />
                          Remember me
                        </label>
                        <button
                          type="button"
                          className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {loginError && (
                        <p className="text-xs text-red-400">{loginError}</p>
                      )}

                      <button
                        type="submit"
                        className="mt-2 w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
                      >
                        {loginLoading ? "Logging in..." : "Login"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Signup side */}
                <div className="flex w-1/2 flex-col border-l border-emerald-500/25 pl-4">
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-lg font-semibold text-white md:text-xl">
                        Create your account
                      </h1>
                    </div>

                    <form className="space-y-4" onSubmit={handleSignupSubmit}>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label
                            htmlFor="signup-first-name"
                            className="text-xs font-medium text-slate-200"
                          >
                            First name<span className="text-red-400"> *</span>
                          </label>
                          <input
                            id="signup-first-name"
                            type="text"
                            name="firstName"
                            required
                            placeholder="John"
                            className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="signup-last-name"
                            className="text-xs font-medium text-slate-200"
                          >
                            Last name<span className="text-red-400"> *</span>
                          </label>
                          <input
                            id="signup-last-name"
                            type="text"
                            name="lastName"
                            required
                            placeholder="Doe"
                            className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="signup-email"
                          className="text-xs font-medium text-slate-200"
                        >
                          Email<span className="text-red-400"> *</span>
                        </label>
                        <input
                          id="signup-email"
                          type="email"
                          name="email"
                          required
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label
                            htmlFor="signup-dob"
                            className="text-xs font-medium text-slate-200"
                          >
                            Date of birth
                            <span className="text-red-400"> *</span>
                          </label>
                          <input
                            id="signup-dob"
                            type="date"
                            name="dateOfBirth"
                            required
                            className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="signup-gender"
                            className="text-xs font-medium text-slate-200"
                          >
                            Gender<span className="text-red-400"> *</span>
                          </label>
                          <select
                            id="signup-gender"
                            name="gender"
                            required
                            className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                          >
                            <option value="">Select gender</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_say">Prefer not to say</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="signup-password"
                          className="text-xs font-medium text-slate-200"
                        >
                          Password<span className="text-red-400"> *</span>
                        </label>
                        <input
                          id="signup-password"
                          type="password"
                          name="password"
                          required
                          placeholder="Create a strong password"
                          className="w-full rounded-xl border border-emerald-400/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring"
                        />
                      </div>

                      {signupError && (
                        <p className="text-xs text-red-400">{signupError}</p>
                      )}

                      <button
                        type="submit"
                        className="mt-2 w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
                      >
                        {signupLoading ? "Creating account..." : "Sign up"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

