"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Role = "PATIENT" | "DOCTOR" | "PHARMACIST" | "RECEPTIONIST" | "ADMIN";

type UserRow = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  fullName: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  joinedDate?: string | null;
  endDate?: string | null;
};

type UsersResponse = {
  users: UserRow[];
  stats: {
    totalUsers: number;
    patients: number;
    doctors: number;
    pharmacists: number;
    receptionists?: number;
    admins: number;
  };
};

type UserDetail = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  person?: {
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    dateOfBirth: string | Date | null;
    gender: string;
  };
  patient?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    mrn?: string;
  } | null;
  employee?: {
    joinedDate: string | Date | null;
    endDate: string | Date | null;
  } | null;
};

type UserDetailResponse = {
  user: UserDetail;
};

export default function AdminUsersPage() {
  const [data, setData] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<UsersResponse["stats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addUserRole, setAddUserRole] = useState<Role | null>(null);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  const closeModal = useCallback(() => {
    setSelectedUserId(null);
    setSelectedUser(null);
    setSelectedError(null);
  }, []);

  const openAddUserModal = useCallback((r: Role) => {
    setAddUserRole(r);
    setAddUserModalOpen(true);
    setAddUserError(null);
  }, []);

  const closeAddUserModal = useCallback(() => {
    setAddUserModalOpen(false);
    setAddUserRole(null);
    setAddUserError(null);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedUserId) closeModal();
        else if (addUserModalOpen) closeAddUserModal();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedUserId, addUserModalOpen, closeModal, closeAddUserModal]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const query = role ? `?role=${encodeURIComponent(role)}` : "";
        const res = await fetch(`/api/admin/users${query}`);
        const json = (await res.json()) as UsersResponse;
        if (!res.ok) {
          throw new Error((json as any)?.error ?? "Failed to load users");
        }
        setData(json.users);
        setStats(json.stats);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong loading users",
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [role]);

  const filteredUsers = data.filter((user) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = (user.fullName ?? "").toLowerCase();
    return (
      name.includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  async function handleSelectUser(userId: string, userRole: Role) {
    if (selectedUserId === userId) {
      closeModal();
      return;
    }

    try {
      setSelectedLoading(true);
      setSelectedError(null);
      setSelectedUserId(userId);
      const res = await fetch(`/api/admin/users/${userId}`);
      const json = (await res.json()) as UserDetailResponse;
      if (!res.ok) {
        throw new Error((json as any)?.error ?? "Failed to load user");
      }
      setSelectedUser(json.user);
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Something went wrong loading user",
      );
    } finally {
      setSelectedLoading(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedUser) return;
    if (
      !window.confirm(
        "Are you sure you want to delete this user permanently?",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error ?? "Failed to delete user");
      }
      // Refresh list
      const query = role ? `?role=${encodeURIComponent(role)}` : "";
      const refreshed = await fetch(`/api/admin/users${query}`);
      const refreshedJson = (await refreshed.json()) as UsersResponse;
      setData(refreshedJson.users);
      setStats(refreshedJson.stats);
      closeModal();
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Something went wrong deleting user",
      );
    }
  }

  function getPersonData(u: UserDetail) {
    return u.person ?? {
      firstName: u.patient?.firstName ?? "",
      lastName: u.patient?.lastName ?? "",
      phone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      dateOfBirth: u.patient?.dateOfBirth ?? null,
      gender: u.patient?.gender ?? "",
    };
  }

  async function handleSaveSelected(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setSelectedError(null);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string | null)?.trim();
    const p = getPersonData(selectedUser);

    const payload: Record<string, unknown> = {};
    if (email && email !== selectedUser.email) payload.email = email;

    payload.person = {
      firstName: (form.get("firstName") as string | null)?.trim() ?? p.firstName,
      lastName: (form.get("lastName") as string | null)?.trim() ?? p.lastName,
      phone: (form.get("phone") as string | null)?.trim() ?? p.phone,
      address1: (form.get("address1") as string | null)?.trim() ?? p.address1,
      address2: (form.get("address2") as string | null)?.trim() ?? p.address2,
      city: (form.get("city") as string | null)?.trim() ?? p.city,
      state: (form.get("state") as string | null)?.trim() ?? p.state,
      zip: (form.get("zip") as string | null)?.trim() ?? p.zip,
      dateOfBirth: (form.get("dateOfBirth") as string | null) || p.dateOfBirth,
      gender: (form.get("gender") as string | null) ?? p.gender,
    };

    const isEmployee =
      selectedUser.role === "DOCTOR" ||
      selectedUser.role === "PHARMACIST" ||
      selectedUser.role === "RECEPTIONIST" ||
      selectedUser.role === "ADMIN";
    if (isEmployee) {
      const joinedDate = form.get("joinedDate") as string | null;
      const endDate = form.get("endDate") as string | null;
      payload.employee = {
        joinedDate: joinedDate || undefined,
        endDate: endDate === "" ? null : endDate || undefined,
      };
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error ?? "Failed to update user");
      }
      // Refresh list to reflect email changes
      const query = role ? `?role=${encodeURIComponent(role)}` : "";
      const refreshed = await fetch(`/api/admin/users${query}`);
      const refreshedJson = (await refreshed.json()) as UsersResponse;
      setData(refreshedJson.users);
      // Keep panel open; updated data will show next time it's loaded
    } catch (err) {
      setSelectedError(
        err instanceof Error ? err.message : "Something went wrong saving user",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!addUserRole) return;
    setAddUserLoading(true);
    setAddUserError(null);

    const form = new FormData(e.currentTarget);
    const firstName = (form.get("firstName") as string | null)?.trim();
    const lastName = (form.get("lastName") as string | null)?.trim();
    const email = (form.get("email") as string | null)?.trim();
    const password = form.get("password") as string | null;
    const dateOfBirth = form.get("dateOfBirth") as string | null;
    const gender = form.get("gender") as string | null;
    const phone = (form.get("phone") as string | null)?.trim();
    const address1 = (form.get("address1") as string | null)?.trim();
    const address2 = (form.get("address2") as string | null)?.trim();
    const city = (form.get("city") as string | null)?.trim();
    const state = (form.get("state") as string | null)?.trim();
    const zip = (form.get("zip") as string | null)?.trim();
    const specialization = (form.get("specialization") as string | null)?.trim();
    const licenseNumber = (form.get("licenseNumber") as string | null)?.trim();
    const consultationFeeStr = (form.get("consultationFee") as string | null)?.trim();
    const joinedDate = form.get("joinedDate") as string | null;

    const isEmployee =
      addUserRole === "DOCTOR" ||
      addUserRole === "PHARMACIST" ||
      addUserRole === "RECEPTIONIST" ||
      addUserRole === "ADMIN";
    const employeeRequired = isEmployee && !joinedDate;
    const baseRequired = !firstName || !lastName || !email || !password;
    const personRequired = !dateOfBirth || !gender;
    if (baseRequired || personRequired || employeeRequired) {
      setAddUserError("Please fill all required fields.");
      setAddUserLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      role: addUserRole,
      firstName,
      lastName,
      email,
      password,
      ...(phone && { phone }),
      ...(address1 && { address1 }),
      ...(address2 && { address2 }),
      ...(city && { city }),
      ...(state && { state }),
      ...(zip && { zip }),
      ...(dateOfBirth && { dateOfBirth }),
      ...(gender && { gender }),
      ...(specialization && { specialization }),
      ...(licenseNumber && { licenseNumber }),
      ...(consultationFeeStr && { consultationFee: parseFloat(consultationFeeStr) || undefined }),
      ...(joinedDate && isEmployee && { joinedDate }),
    };

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAddUserError((json as { error?: string })?.error ?? `Failed to create ${addUserRole.toLowerCase()}.`);
        return;
      }

      const query = role ? `?role=${encodeURIComponent(role)}` : "";
      const refreshed = await fetch(`/api/admin/users${query}`);
      const refreshedJson = (await refreshed.json()) as UsersResponse;
      setData(refreshedJson.users);
      setStats(refreshedJson.stats);
      closeAddUserModal();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setAddUserError("Something went wrong. Please try again.");
    } finally {
      setAddUserLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Users</h1>
          <p className="text-xs text-slate-400">
            All users in the system, grouped by role.
          </p>
        </div>
        {role && (
          <button
            type="button"
            onClick={() => openAddUserModal(role as Role)}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-[0.75rem] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"
          >
            + Add {getAddButtonLabel(role)}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4">
        <div className="flex flex-col gap-2 mb-3 text-xs text-slate-300 md:flex-row md:items-center md:justify-between">
            <span>
              {getActiveLabel(role)}: {getActiveCount(role, stats, data.length)}
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-full border border-emerald-500/30 bg-slate-950/80 px-3 py-1.5 text-[0.75rem] text-white outline-none ring-emerald-500/30 focus:ring md:w-56"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-slate-200">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 text-left font-medium">Full name</th>
                <th className="py-2 pr-4 text-left font-medium">Email</th>
                <th className="py-2 pr-4 text-left font-medium">Role</th>
                {(role === "DOCTOR" || role === "PHARMACIST" || role === "RECEPTIONIST" || role === "ADMIN") && (
                  <>
                    <th className="py-2 pr-4 text-left font-medium">Start date</th>
                    <th className="py-2 pr-4 text-left font-medium">End date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-500">
                    Loading users...
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={6} className="py-4 text-red-400">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleSelectUser(user.id, user.role)}
                    className={`border-t border-slate-900/80 cursor-pointer ${
                      selectedUserId === user.id
                        ? "bg-slate-900/90"
                        : "hover:bg-slate-900/80"
                    }`}
                  >
                    <td className="py-2 pr-4">
                      {user.fullName ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{user.email}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[0.68rem] font-medium text-emerald-200 border border-emerald-500/40">
                        {user.role.toLowerCase()}
                      </span>
                    </td>
                    {(role === "DOCTOR" || role === "PHARMACIST" || role === "RECEPTIONIST" || role === "ADMIN") && (
                      <>
                        <td className="py-2 pr-4 text-slate-400">
                          {user.joinedDate
                            ? new Date(user.joinedDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-2 pr-4 text-slate-400">
                          {user.endDate
                            ? new Date(user.endDate).toLocaleDateString()
                            : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User details modal */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 shadow-xl shadow-emerald-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="modal-title" className="text-base font-semibold text-emerald-200">
                User details
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {selectedLoading ? (
              <p className="py-8 text-center text-slate-500">Loading user information...</p>
            ) : selectedError && !selectedUser ? (
              <p className="py-8 text-red-400">{selectedError}</p>
            ) : selectedUser ? (
              <form onSubmit={handleSaveSelected} className="space-y-3 text-xs text-slate-200">
                {selectedError && (
                  <p className="text-red-400">{selectedError}</p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="text-[0.7rem] font-medium text-slate-200"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={selectedUser.email}
                      className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.7rem] font-medium text-slate-200">
                      Role
                    </label>
                    <input
                      disabled
                      value={selectedUser.role.toLowerCase()}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300"
                    />
                  </div>
                </div>

                <div className="mt-2 space-y-3">
                  <h3 className="text-[0.7rem] font-semibold text-emerald-200">
                    Basic info
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="firstName" className="text-[0.7rem] font-medium text-slate-200">First name</label>
                      <input id="firstName" name="firstName" type="text" defaultValue={getPersonData(selectedUser).firstName} className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="lastName" className="text-[0.7rem] font-medium text-slate-200">Last name</label>
                      <input id="lastName" name="lastName" type="text" defaultValue={getPersonData(selectedUser).lastName} className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-[0.7rem] font-medium text-slate-200">Phone</label>
                    <input id="phone" name="phone" type="tel" defaultValue={getPersonData(selectedUser).phone} placeholder="+1-555-0123" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="address1" className="text-[0.7rem] font-medium text-slate-200">Address</label>
                    <input id="address1" name="address1" type="text" defaultValue={getPersonData(selectedUser).address1} placeholder="123 Main Street" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="address2" className="text-[0.7rem] font-medium text-slate-200">Address 2</label>
                    <input id="address2" name="address2" type="text" defaultValue={getPersonData(selectedUser).address2} placeholder="Apt 4B (optional)" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor="city" className="text-[0.7rem] font-medium text-slate-200">City</label>
                      <input id="city" name="city" type="text" defaultValue={getPersonData(selectedUser).city} placeholder="Boston" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="state" className="text-[0.7rem] font-medium text-slate-200">State</label>
                      <input id="state" name="state" type="text" defaultValue={getPersonData(selectedUser).state} placeholder="MA" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="zip" className="text-[0.7rem] font-medium text-slate-200">ZIP</label>
                      <input id="zip" name="zip" type="text" defaultValue={getPersonData(selectedUser).zip} placeholder="02101" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="dateOfBirth" className="text-[0.7rem] font-medium text-slate-200">Date of birth</label>
                      <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={getPersonData(selectedUser).dateOfBirth ? new Date(getPersonData(selectedUser).dateOfBirth as string).toISOString().slice(0, 10) : ""} className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="gender" className="text-[0.7rem] font-medium text-slate-200">Gender</label>
                      <select id="gender" name="gender" defaultValue={getPersonData(selectedUser).gender} className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  {selectedUser.role === "PATIENT" && selectedUser.patient?.mrn && (
                    <div className="space-y-1">
                      <label className="text-[0.7rem] font-medium text-slate-200">MRN</label>
                      <input disabled value={selectedUser.patient.mrn} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300" />
                    </div>
                  )}
                  {(selectedUser.role === "DOCTOR" ||
                    selectedUser.role === "PHARMACIST" ||
                    selectedUser.role === "RECEPTIONIST" ||
                    selectedUser.role === "ADMIN") && (
                    <div className="space-y-3 border-t border-slate-800 pt-3">
                      <h3 className="text-[0.7rem] font-semibold text-emerald-200">
                        Employment
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label htmlFor="joinedDate" className="text-[0.7rem] font-medium text-slate-200">Joined date</label>
                          <input
                            id="joinedDate"
                            name="joinedDate"
                            type="date"
                            defaultValue={
                              selectedUser.employee?.joinedDate
                                ? new Date(selectedUser.employee.joinedDate as string).toISOString().slice(0, 10)
                                : ""
                            }
                            className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="endDate" className="text-[0.7rem] font-medium text-slate-200">End date</label>
                          <input
                            id="endDate"
                            name="endDate"
                            type="date"
                            placeholder="Leave blank if still working"
                            defaultValue={
                              selectedUser.employee?.endDate
                                ? new Date(selectedUser.employee.endDate as string).toISOString().slice(0, 10)
                                : ""
                            }
                            className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                            title="Leave blank if employee is still working"
                          />
                        </div>
                      </div>
                      <p className="text-[0.65rem] text-slate-400">Leave end date blank if the employee is still working.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="rounded-full border border-red-500/60 px-3 py-1.5 text-[0.75rem] font-medium text-red-300 hover:bg-red-500/10"
                  >
                    Delete user
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.8rem] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* Add User modal */}
      {addUserModalOpen && addUserRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={closeAddUserModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-modal-title"
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 shadow-xl shadow-emerald-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="add-user-modal-title" className="text-base font-semibold text-emerald-200">
                Add {addUserRole.toLowerCase()}
              </h2>
              <button
                type="button"
                onClick={closeAddUserModal}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs text-slate-200">
              {addUserError && (
                <p className="text-red-400">{addUserError}</p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="add-firstName" className="text-[0.7rem] font-medium text-slate-200">First name</label>
                  <input
                    id="add-firstName"
                    name="firstName"
                    type="text"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="add-lastName" className="text-[0.7rem] font-medium text-slate-200">Last name</label>
                  <input
                    id="add-lastName"
                    name="lastName"
                    type="text"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="add-email" className="text-[0.7rem] font-medium text-slate-200">Email</label>
                <input
                  id="add-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="add-password" className="text-[0.7rem] font-medium text-slate-200">Password</label>
                <input
                  id="add-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="add-phone" className="text-[0.7rem] font-medium text-slate-200">Phone</label>
                <input id="add-phone" name="phone" type="tel" placeholder="+1-555-0123" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
              </div>
              <div className="space-y-1">
                <label htmlFor="add-address1" className="text-[0.7rem] font-medium text-slate-200">Address</label>
                <input id="add-address1" name="address1" type="text" placeholder="123 Main Street" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
              </div>
              <div className="space-y-1">
                <label htmlFor="add-address2" className="text-[0.7rem] font-medium text-slate-200">Address 2</label>
                <input id="add-address2" name="address2" type="text" placeholder="Apt 4B (optional)" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="add-city" className="text-[0.7rem] font-medium text-slate-200">City</label>
                  <input id="add-city" name="city" type="text" placeholder="Boston" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="add-state" className="text-[0.7rem] font-medium text-slate-200">State</label>
                  <input id="add-state" name="state" type="text" placeholder="MA" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="add-zip" className="text-[0.7rem] font-medium text-slate-200">ZIP</label>
                  <input id="add-zip" name="zip" type="text" placeholder="02101" className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="add-dateOfBirth" className="text-[0.7rem] font-medium text-slate-200">Date of birth</label>
                  <input
                    id="add-dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="add-gender" className="text-[0.7rem] font-medium text-slate-200">Gender</label>
                  <select
                    id="add-gender"
                    name="gender"
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {(addUserRole === "DOCTOR" ||
                addUserRole === "PHARMACIST" ||
                addUserRole === "RECEPTIONIST" ||
                addUserRole === "ADMIN") && (
                <div className="space-y-1">
                  <label htmlFor="add-joinedDate" className="text-[0.7rem] font-medium text-slate-200">Joined date</label>
                  <input
                    id="add-joinedDate"
                    name="joinedDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
              )}

              {(addUserRole === "DOCTOR" || addUserRole === "PHARMACIST") && (
                <div className="space-y-1">
                  <label htmlFor="add-licenseNumber" className="text-[0.7rem] font-medium text-slate-200">License number</label>
                  <input
                    id="add-licenseNumber"
                    name="licenseNumber"
                    type="text"
                    placeholder="Optional"
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                  />
                </div>
              )}

              {addUserRole === "DOCTOR" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="add-specialization" className="text-[0.7rem] font-medium text-slate-200">Specialization</label>
                    <input
                      id="add-specialization"
                      name="specialization"
                      type="text"
                      placeholder="e.g. Cardiology"
                      className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="add-consultationFee" className="text-[0.7rem] font-medium text-slate-200">Consultation fee</label>
                    <input
                      id="add-consultationFee"
                      name="consultationFee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Optional"
                      className="w-full rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none ring-emerald-500/40 focus:ring"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAddUserModal}
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-[0.75rem] font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.8rem] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {addUserLoading ? "Creating..." : `Add ${addUserRole.toLowerCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getAddButtonLabel(role: string) {
  switch (role) {
    case "PATIENT":
      return "patient";
    case "DOCTOR":
      return "doctor";
    case "PHARMACIST":
      return "pharmacist";
    case "RECEPTIONIST":
      return "receptionist";
    case "ADMIN":
      return "admin";
    default:
      return "user";
  }
}

function getActiveLabel(role: string | null) {
  switch (role) {
    case "PATIENT":
      return "Patients";
    case "DOCTOR":
      return "Doctors";
    case "PHARMACIST":
      return "Pharmacists";
    case "RECEPTIONIST":
      return "Receptionists";
    case "ADMIN":
      return "Admins";
    default:
      return "Total users";
  }
}

function getActiveCount(
  role: string | null,
  stats: UsersResponse["stats"] | null,
  fallback: number,
) {
  if (!stats) return fallback;

  switch (role) {
    case "PATIENT":
      return stats.patients;
    case "DOCTOR":
      return stats.doctors;
    case "PHARMACIST":
      return stats.pharmacists;
    case "RECEPTIONIST":
      return stats.receptionists ?? 0;
    case "ADMIN":
      return stats.admins;
    default:
      return stats.totalUsers;
  }
}

