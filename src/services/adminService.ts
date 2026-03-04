import bcrypt from "bcryptjs";
import { prisma } from "@/models";

const ROLES = ["PATIENT", "DOCTOR", "PHARMACIST", "ADMIN", "RECEPTIONIST"] as const;
type RoleName = (typeof ROLES)[number];

export type CreateUserInput = {
  role: RoleName;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  dateOfBirth?: string;
  gender?: string;
  joinedDate?: string;
  clinicId?: string;
  pharmacyId?: string;
  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
};

export async function getAdminOverview() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfWeekForSignUps = new Date(startOfToday);
  startOfWeekForSignUps.setDate(startOfWeekForSignUps.getDate() - 7);

  const [
    totalUsers,
    recentAccountsWithPatient,
    recentFeedback,
    newSignUpsLast7Days,
    appointmentsToday,
    appointmentsThisWeek,
    recentAppointmentsRaw,
  ] = await Promise.all([
    prisma.userAccount.count(),
    prisma.userAccount.findMany({
      where: { roles: { some: { role: { name: "PATIENT" } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        person: { include: { patient: true } },
        roles: { include: { role: true } },
      },
    }),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { userAccount: { include: { person: true } } },
    }),
    prisma.userAccount.count({
      where: { createdAt: { gte: startOfWeekForSignUps } },
    }),
    prisma.appointment.count({
      where: { startAt: { gte: startOfToday } },
    }),
    prisma.appointment.count({
      where: { startAt: { gte: startOfWeek } },
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true } },
      },
    }),
  ]);

  const roleCounts = await Promise.all(
    ROLES.map((name) =>
      prisma.userRole.count({
        where: { role: { name } },
      }),
    ),
  );
  const [patients, doctors, pharmacists, admins, receptionists] = roleCounts;

  return {
    totalUsers,
    patients,
    doctors,
    pharmacists,
    admins,
    receptionists,
    newSignUpsLast7Days,
    appointmentsToday,
    appointmentsThisWeek,
    recentPatients: recentAccountsWithPatient.map((a) => ({
      id: a.id,
      email: a.email ?? a.person.email ?? "",
      createdAt: a.createdAt,
      firstName: a.person.firstName,
      lastName: a.person.lastName,
      mrn: a.person.patient?.mrn ?? null,
    })),
    recentFeedback: recentFeedback.map((f) => ({
      id: f.id,
      message: f.message,
      createdAt: f.createdAt,
      userEmail: f.userAccount.email ?? f.userAccount.person.email ?? "",
      userRole: f.userAccount.roles[0]?.role?.name ?? "PATIENT",
    })),
    recentAppointments: recentAppointmentsRaw.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      status: a.status,
      patientName: `${a.patient.person.firstName} ${a.patient.person.lastName}`.trim(),
      doctorName: `${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
    })),
    roleDistribution: [
      { role: "Patient", count: patients },
      { role: "Doctor", count: doctors },
      { role: "Pharmacist", count: pharmacists },
      { role: "Receptionist", count: receptionists },
      { role: "Admin", count: admins },
    ],
  };
}

export async function getUserStats() {
  const [totalUsers, ...counts] = await Promise.all([
    prisma.userAccount.count(),
    ...ROLES.map((name) =>
      prisma.userRole.count({ where: { role: { name } } }),
    ),
  ]);
  const [patients, doctors, pharmacists, admins, receptionists] = counts;
  return {
    totalUsers,
    patients,
    doctors,
    pharmacists,
    admins,
    receptionists,
  };
}

export async function getAllUsers(role?: string | null) {
  const roleFilter =
    role && ROLES.includes(role as RoleName)
      ? { roles: { some: { role: { name: role as RoleName } } } }
      : undefined;

  const accounts = await prisma.userAccount.findMany({
    where: roleFilter,
    include: {
      person: {
        include: {
          patient: true,
          doctor: true,
          pharmacist: true,
          receptionist: true,
          admin: true,
        },
      },
      roles: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return accounts.map((a) => {
    const primaryRole = a.roles[0]?.role?.name ?? "PATIENT";
    const p = a.person;
    const emp =
      primaryRole === "DOCTOR" && p.doctor
        ? { joinedDate: p.doctor.joinedDate, endDate: p.doctor.endDate }
        : primaryRole === "PHARMACIST" && p.pharmacist
          ? { joinedDate: p.pharmacist.joinedDate, endDate: p.pharmacist.endDate }
          : primaryRole === "RECEPTIONIST" && p.receptionist
            ? { joinedDate: p.receptionist.joinedDate, endDate: p.receptionist.endDate }
            : primaryRole === "ADMIN" && p.admin
              ? { joinedDate: p.admin.joinedDate, endDate: p.admin.endDate }
              : null;
    return {
      id: a.id,
      email: a.email ?? a.person.email ?? "",
      role: primaryRole,
      createdAt: a.createdAt,
      fullName: `${a.person.firstName} ${a.person.lastName}`.trim() || null,
      dateOfBirth: a.person.dob,
      gender: a.person.sex ?? null,
      ...(emp && { joinedDate: emp.joinedDate, endDate: emp.endDate }),
    };
  });
}

export async function getUserById(id: string) {
  const account = await prisma.userAccount.findUnique({
    where: { id },
    include: {
      person: {
        include: {
          patient: true,
          doctor: true,
          pharmacist: true,
          admin: true,
          receptionist: true,
        },
      },
      roles: { include: { role: true } },
    },
  });

  if (!account) return null;

  const primaryRole = account.roles[0]?.role?.name ?? "PATIENT";
  const p = account.person;

  const employee =
    primaryRole === "DOCTOR" && p.doctor
      ? { joinedDate: p.doctor.joinedDate, endDate: p.doctor.endDate }
      : primaryRole === "PHARMACIST" && p.pharmacist
        ? { joinedDate: p.pharmacist.joinedDate, endDate: p.pharmacist.endDate }
        : primaryRole === "RECEPTIONIST" && p.receptionist
          ? { joinedDate: p.receptionist.joinedDate, endDate: p.receptionist.endDate }
          : primaryRole === "ADMIN" && p.admin
            ? { joinedDate: p.admin.joinedDate, endDate: p.admin.endDate }
            : null;

  return {
    id: account.id,
    email: account.email ?? p.email ?? "",
    role: primaryRole,
    createdAt: account.createdAt,
    person: {
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone ?? "",
      address1: p.address1 ?? "",
      address2: p.address2 ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      zip: p.zip ?? "",
      dateOfBirth: p.dob,
      gender: p.sex ?? "",
    },
    patient:
      primaryRole === "PATIENT" && p.patient
        ? { mrn: p.patient.mrn }
        : null,
    employee,
  };
}

export async function updateUserById(
  id: string,
  data: {
    email?: string;
    person?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      dateOfBirth?: string;
      gender?: string;
    } | null;
    patient?: { mrn?: string } | null;
    employee?: { joinedDate?: string; endDate?: string } | null;
  },
) {
  const account = await prisma.userAccount.findUnique({
    where: { id },
    include: {
      person: {
        include: {
          patient: true,
          doctor: true,
          pharmacist: true,
          receptionist: true,
          admin: true,
        },
      },
      roles: { include: { role: true } },
    },
  });

  if (!account) throw new Error("User not found");

  if (data.email) {
    await prisma.userAccount.update({
      where: { id },
      data: { email: data.email },
    });
  }

  const personData = data.person ?? (data as { patient?: Record<string, unknown> }).patient;
  if (personData && typeof personData === "object" && account.person) {
    const p = personData as Record<string, unknown>;
    const dob = p.dateOfBirth ?? p.dob;
    const sex = p.gender ?? p.sex;
    await prisma.person.update({
      where: { id: account.personId },
      data: {
        ...(p.firstName != null && { firstName: String(p.firstName) }),
        ...(p.lastName != null && { lastName: String(p.lastName) }),
        ...(p.phone != null && { phone: p.phone ? String(p.phone) : null }),
        ...(p.address1 != null && { address1: p.address1 ? String(p.address1) : null }),
        ...(p.address2 != null && { address2: p.address2 ? String(p.address2) : null }),
        ...(p.city != null && { city: p.city ? String(p.city) : null }),
        ...(p.state != null && { state: p.state ? String(p.state) : null }),
        ...(p.zip != null && { zip: p.zip ? String(p.zip) : null }),
        ...(dob != null && { dob: dob ? new Date(dob as string) : null }),
        ...(sex != null && { sex: sex ? String(sex) : null }),
      },
    });
  }

  const employeeData = data.employee;
  if (employeeData && account) {
    const { person, roles } = account;
    const primaryRole = roles[0]?.role?.name;
    if (primaryRole === "DOCTOR" && person?.doctor) {
      await prisma.doctor.update({
        where: { id: person.doctor.id },
        data: {
          ...(employeeData.joinedDate != null && {
            joinedDate: employeeData.joinedDate ? new Date(employeeData.joinedDate) : null,
          }),
          ...(employeeData.endDate !== undefined && {
            endDate: employeeData.endDate ? new Date(employeeData.endDate) : null,
          }),
        },
      });
    } else if (primaryRole === "PHARMACIST" && person?.pharmacist) {
      await prisma.pharmacist.update({
        where: { id: person.pharmacist.id },
        data: {
          ...(employeeData.joinedDate != null && {
            joinedDate: employeeData.joinedDate ? new Date(employeeData.joinedDate) : null,
          }),
          ...(employeeData.endDate !== undefined && {
            endDate: employeeData.endDate ? new Date(employeeData.endDate) : null,
          }),
        },
      });
    } else if (primaryRole === "RECEPTIONIST" && person?.receptionist) {
      await prisma.receptionist.update({
        where: { id: person.receptionist.id },
        data: {
          ...(employeeData.joinedDate != null && {
            joinedDate: employeeData.joinedDate ? new Date(employeeData.joinedDate) : null,
          }),
          ...(employeeData.endDate !== undefined && {
            endDate: employeeData.endDate ? new Date(employeeData.endDate) : null,
          }),
        },
      });
    } else if (primaryRole === "ADMIN" && person?.admin) {
      await prisma.admin.update({
        where: { id: person.admin.id },
        data: {
          ...(employeeData.joinedDate != null && {
            joinedDate: employeeData.joinedDate ? new Date(employeeData.joinedDate) : null,
          }),
          ...(employeeData.endDate !== undefined && {
            endDate: employeeData.endDate ? new Date(employeeData.endDate) : null,
          }),
        },
      });
    }
  }

  return prisma.userAccount.findUnique({ where: { id } });
}

export async function deleteUserById(id: string) {
  const account = await prisma.userAccount.findUnique({
    where: { id },
    select: { personId: true },
  });
  if (!account) throw new Error("User not found");
  await prisma.userAccount.delete({ where: { id } });
  await prisma.person.delete({ where: { id: account.personId } });
}

export async function createUser(data: CreateUserInput) {
  const existing = await prisma.userAccount.findFirst({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const roleRecord = await prisma.role.findUnique({
    where: { name: data.role },
  });
  if (!roleRecord) {
    throw new Error(`Invalid role: ${data.role}`);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const clinic = data.clinicId
    ? await prisma.clinic.findUnique({ where: { id: data.clinicId } })
    : await prisma.clinic.findFirst();
  const pharmacy = data.pharmacyId
    ? await prisma.pharmacy.findUnique({ where: { id: data.pharmacyId } })
    : await prisma.pharmacy.findFirst();

  if (data.role === "RECEPTIONIST" && !clinic) {
    throw new Error("No clinic exists. Create a clinic first.");
  }
  if (data.role === "PHARMACIST" && !pharmacy) {
    throw new Error("No pharmacy exists. Create a pharmacy first.");
  }

  const person = await prisma.person.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      ...(data.phone && { phone: data.phone }),
      ...(data.address1 && { address1: data.address1 }),
      ...(data.address2 && { address2: data.address2 }),
      ...(data.city && { city: data.city }),
      ...(data.state && { state: data.state }),
      ...(data.zip && { zip: data.zip }),
      ...(data.dateOfBirth && { dob: new Date(data.dateOfBirth) }),
      ...(data.gender && { sex: data.gender }),
    },
  });

  if (data.role === "PATIENT") {
    const mrn = `MRN-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    await prisma.patient.create({
      data: { personId: person.id, mrn },
    });
  } else if (data.role === "DOCTOR") {
    await prisma.doctor.create({
      data: {
        personId: person.id,
        clinicId: clinic?.id ?? undefined,
        specialization: data.specialization ?? undefined,
        licenseNumber: data.licenseNumber ?? undefined,
        consultationFee: data.consultationFee ?? undefined,
        joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
      },
    });
  } else if (data.role === "PHARMACIST") {
    if (!pharmacy) throw new Error("No pharmacy exists. Create a pharmacy first.");
    await prisma.pharmacist.create({
      data: {
        personId: person.id,
        pharmacyId: pharmacy.id,
        licenseNumber: data.licenseNumber ?? undefined,
        joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
      },
    });
  } else if (data.role === "RECEPTIONIST") {
    if (!clinic) throw new Error("No clinic exists. Create a clinic first.");
    await prisma.receptionist.create({
      data: {
        personId: person.id,
        clinicId: clinic.id,
        joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
      },
    });
  } else if (data.role === "ADMIN") {
    await prisma.admin.create({
      data: {
        personId: person.id,
        clinicId: clinic?.id ?? undefined,
        joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
      },
    });
  }

  await prisma.userAccount.create({
    data: {
      personId: person.id,
      email: data.email,
      passwordHash,
      roles: { create: { roleId: roleRecord.id } },
    },
  });

  return { message: "User created successfully." };
}
