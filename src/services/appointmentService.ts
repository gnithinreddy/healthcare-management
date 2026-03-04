import { prisma } from "@/models";

const STATUSES = ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type AppointmentStatus = (typeof STATUSES)[number];

export type CreateAppointmentInput = {
  patientId: string;
  doctorId: string;
  clinicId?: string;
  startAt: string;
  endAt: string;
  reason?: string;
  status?: AppointmentStatus;
};

export async function getAppointments(filters?: {
  status?: string;
  patientId?: string;
  doctorId?: string;
  from?: string;
  to?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.status && STATUSES.includes(filters.status as AppointmentStatus)) {
    where.status = filters.status;
  }
  if (filters?.patientId) where.patientId = filters.patientId;
  if (filters?.doctorId) where.doctorId = filters.doctorId;
  if (filters?.from || filters?.to) {
    const dateFilter: Record<string, Date> = {};
    if (filters?.from) dateFilter.gte = new Date(filters.from);
    if (filters?.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    where.startAt = dateFilter;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { include: { person: true } },
      doctor: { include: { person: true } },
      clinic: true,
    },
    orderBy: { startAt: "desc" },
  });

  return appointments.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    clinicId: a.clinicId,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    reason: a.reason ?? null,
    createdAt: a.createdAt,
    patientName: `${a.patient.person.firstName} ${a.patient.person.lastName}`.trim(),
    doctorName: `${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
    clinicName: a.clinic?.name ?? null,
  }));
}

export async function getAppointmentById(id: string) {
  const a = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { person: true } },
      doctor: { include: { person: true } },
      clinic: true,
    },
  });

  if (!a) return null;

  return {
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    clinicId: a.clinicId,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    reason: a.reason ?? null,
    createdAt: a.createdAt,
    patientName: `${a.patient.person.firstName} ${a.patient.person.lastName}`.trim(),
    doctorName: `${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
    clinicName: a.clinic?.name ?? null,
  };
}

export async function createAppointment(data: CreateAppointmentInput) {
  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  if (endAt <= startAt) {
    throw new Error("End time must be after start time.");
  }

  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new Error("Patient not found.");

  const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
  if (!doctor) throw new Error("Doctor not found.");

  const now = new Date();
  const activeCount = await prisma.appointment.count({
    where: {
      doctorId: data.doctorId,
      status: { in: ["REQUESTED", "CONFIRMED"] },
      startAt: { gte: now },
    },
  });
  if (activeCount >= 10) {
    throw new Error("This doctor has reached the maximum of 10 active appointments. Please choose another doctor or time.");
  }

  // Check for overlapping appointment (same doctor, same time slot)
  const overlapping = await prisma.appointment.findFirst({
    where: {
      doctorId: data.doctorId,
      status: { in: ["REQUESTED", "CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  if (overlapping) {
    throw new Error("This time slot is already booked. Please choose another time.");
  }

  const clinic = data.clinicId
    ? await prisma.clinic.findUnique({ where: { id: data.clinicId } })
    : await prisma.clinic.findFirst();

  const appointment = await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      doctorId: data.doctorId,
      clinicId: data.clinicId ?? clinic?.id ?? undefined,
      startAt,
      endAt,
      reason: data.reason ?? undefined,
      status: (data.status as AppointmentStatus) ?? "REQUESTED",
    },
    include: {
      patient: { include: { person: true } },
      doctor: { include: { person: true } },
      clinic: true,
    },
  });

  return {
    id: appointment.id,
    patientName: `${appointment.patient.person.firstName} ${appointment.patient.person.lastName}`.trim(),
    doctorName: `${appointment.doctor.person.firstName} ${appointment.doctor.person.lastName}`.trim(),
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    status: appointment.status,
  };
}

export async function updateAppointmentById(
  id: string,
  data: {
    startAt?: string;
    endAt?: string;
    status?: AppointmentStatus;
    reason?: string;
    clinicId?: string | null;
  },
) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new Error("Appointment not found.");

  const updateData: Record<string, unknown> = {};
  if (data.startAt != null) updateData.startAt = new Date(data.startAt);
  if (data.endAt != null) updateData.endAt = new Date(data.endAt);
  if (data.status != null) updateData.status = data.status;
  if (data.reason !== undefined) updateData.reason = data.reason || null;
  if (data.clinicId !== undefined) updateData.clinicId = data.clinicId || null;

  if (
    updateData.startAt &&
    updateData.endAt &&
    (updateData.endAt as Date) <= (updateData.startAt as Date)
  ) {
    throw new Error("End time must be after start time.");
  }

  if (updateData.startAt && updateData.endAt) {
    const newStart = updateData.startAt as Date;
    const newEnd = updateData.endAt as Date;
    const overlapping = await prisma.appointment.findFirst({
      where: {
        doctorId: existing.doctorId,
        id: { not: id },
        status: { in: ["REQUESTED", "CONFIRMED"] },
        startAt: { lt: newEnd },
        endAt: { gt: newStart },
      },
    });
    if (overlapping) {
      throw new Error("This time slot is already booked. Please choose another time.");
    }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
  });

  // Auto-create invoice when appointment is marked COMPLETED
  if (updateData.status === "COMPLETED") {
    const { autoCreateInvoiceForAppointment } = await import("./invoiceService");
    try {
      await autoCreateInvoiceForAppointment(id);
    } catch (e) {
      console.error("Auto-create invoice:", e);
    }
  }

  return updated;
}

export async function deleteAppointmentById(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new Error("Appointment not found.");

  await prisma.appointment.delete({ where: { id } });
}

export async function getPatientsForSelect() {
  const patients = await prisma.patient.findMany({
    include: { person: true },
    orderBy: { person: { lastName: "asc" } },
  });
  return patients.map((p) => ({
    id: p.id,
    label: `${p.person.firstName} ${p.person.lastName}`.trim(),
    mrn: p.mrn,
  }));
}

export async function getDoctorsForSelect() {
  const doctors = await prisma.doctor.findMany({
    include: { person: true },
    where: { endDate: null },
    orderBy: { person: { lastName: "asc" } },
  });
  return doctors.map((d) => ({
    id: d.id,
    label: `Dr. ${d.person.firstName} ${d.person.lastName}`.trim(),
    specialization: d.specialization ?? null,
  }));
}

export async function getClinicsForSelect() {
  const clinics = await prisma.clinic.findMany({
    orderBy: { name: "asc" },
  });
  return clinics.map((c) => ({
    id: c.id,
    label: c.name,
  }));
}
