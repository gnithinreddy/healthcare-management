import { prisma } from "@/models";
import { getCheckedInAtMap } from "./checkedInHelper";
import { updateAppointmentById } from "./appointmentService";
import type { AppointmentStatus } from "./appointmentService";

export async function getReceptionistDashboard(receptionistId: string) {
  const receptionist = await prisma.receptionist.findUnique({
    where: { id: receptionistId, endDate: null },
    include: {
      person: true,
      clinic: true,
    },
  });

  if (!receptionist) return null;

  const clinicId = receptionist.clinicId;

  const clinicDoctors = await prisma.doctor.findMany({
    where: { endDate: null, clinicId },
    include: { person: true },
    orderBy: { person: { lastName: "asc" } },
  });

  const appointments = await prisma.appointment.findMany({
    where: { clinicId },
    include: {
      patient: { include: { person: true } },
      doctor: { include: { person: true } },
      clinic: true,
    },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const todayAppointments = appointments.filter(
    (a) =>
      a.clinicId === clinicId &&
      a.startAt >= startOfToday &&
      a.startAt < endOfToday &&
      a.status !== "CANCELLED",
  );
  const upcoming = appointments.filter(
    (a) =>
      a.clinicId === clinicId &&
      a.startAt >= endOfToday &&
      (a.status === "REQUESTED" || a.status === "CONFIRMED"),
  );
  const past = appointments.filter(
    (a) =>
      a.clinicId === clinicId &&
      (a.startAt < startOfToday ||
        a.status === "CANCELLED" ||
        a.status === "COMPLETED" ||
        a.status === "NO_SHOW"),
  );

  const checkedInMap = await getCheckedInAtMap(appointments.map((a) => a.id));
  const mapAppointment = (a: (typeof appointments)[0]) => ({
    id: a.id,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    reason: a.reason ?? null,
    checkedInAt: (checkedInMap.get(a.id) ?? a.checkedInAt)?.toISOString() ?? null,
    patientName: `${a.patient.person.firstName} ${a.patient.person.lastName}`.trim(),
    patientMrn: a.patient.mrn,
    patientId: a.patientId,
    doctorId: a.doctorId,
    doctorName: `Dr. ${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
    clinicName: a.clinic?.name ?? null,
  });

  const callNextDoctors = clinicDoctors.filter(
    (d) =>
      d.callNextRequestedAt &&
      d.callNextRequestedAt >
        new Date(Date.now() - 10 * 60 * 1000),
  );
  const callNextInfo = await Promise.all(
    callNextDoctors.map(async (d) => {
      const nextAppt = await prisma.appointment.findFirst({
        where: {
          doctorId: d.id,
          status: "CONFIRMED",
          startAt: { gte: startOfToday, lt: endOfToday },
        },
        include: { patient: { include: { person: true } } },
        orderBy: { startAt: "asc" },
      });
      return {
        doctorId: d.id,
        doctorName: `Dr. ${d.person.firstName} ${d.person.lastName}`.trim(),
        requestedAt: d.callNextRequestedAt!.toISOString(),
        nextPatient: nextAppt
          ? {
              id: nextAppt.id,
              name: `${nextAppt.patient.person.firstName} ${nextAppt.patient.person.lastName}`.trim(),
              mrn: nextAppt.patient.mrn,
            }
          : null,
      };
    }),
  );

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const noShowsThisWeek = appointments.filter(
    (a) =>
      a.clinicId === clinicId &&
      a.status === "NO_SHOW" &&
      a.startAt >= startOfWeek &&
      a.startAt < endOfWeek,
  ).length;

  const patientsSeenThisWeek = appointments.filter(
    (a) =>
      a.clinicId === clinicId &&
      a.status === "COMPLETED" &&
      a.startAt >= startOfWeek &&
      a.startAt < endOfWeek,
  ).length;

  const pendingCount = appointments.filter(
    (a) => a.clinicId === clinicId && a.status === "REQUESTED",
  ).length;

  const sameDayRequests = appointments.filter(
    (a) =>
      a.clinicId === clinicId &&
      a.status === "REQUESTED" &&
      a.startAt >= startOfToday &&
      a.startAt < endOfToday,
  ).length;

  return {
    receptionist: {
      id: receptionist.id,
      firstName: receptionist.person.firstName,
      lastName: receptionist.person.lastName,
    },
    clinic: {
      id: receptionist.clinic.id,
      name: receptionist.clinic.name,
      phone: receptionist.clinic.phone ?? null,
    },
    profile: {
      firstName: receptionist.person.firstName,
      lastName: receptionist.person.lastName,
      email: receptionist.person.email ?? "",
      phone: receptionist.person.phone ?? "",
      address1: receptionist.person.address1 ?? "",
      address2: receptionist.person.address2 ?? "",
      city: receptionist.person.city ?? "",
      state: receptionist.person.state ?? "",
      zip: receptionist.person.zip ?? "",
      dateOfBirth: receptionist.person.dob,
      gender: receptionist.person.sex ?? "",
    },
    todayAppointments: todayAppointments
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map(mapAppointment),
    upcomingAppointments: upcoming
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map(mapAppointment),
    pastAppointments: past
      .sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
      .map(mapAppointment),
    stats: {
      todayCount: todayAppointments.length,
      pendingCount,
      noShowsThisWeek,
      patientsSeenThisWeek,
      sameDayRequests,
    },
    clinicInfo: {
      id: receptionist.clinic.id,
      name: receptionist.clinic.name,
      phone: receptionist.clinic.phone ?? null,
      address1: receptionist.clinic.address1 ?? null,
      city: receptionist.clinic.city ?? null,
      state: receptionist.clinic.state ?? null,
      zip: receptionist.clinic.zip ?? null,
    },
    doctors: clinicDoctors.map((d) => ({
      id: d.id,
      name: `Dr. ${d.person.firstName} ${d.person.lastName}`.trim(),
      specialization: d.specialization ?? null,
    })),
    callNextInfo,
  };
}

export async function updateReceptionistAppointmentStatus(
  receptionistId: string,
  appointmentId: string,
  status: AppointmentStatus,
) {
  const receptionist = await prisma.receptionist.findUnique({
    where: { id: receptionistId, endDate: null },
  });

  if (!receptionist) throw new Error("Receptionist not found.");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) throw new Error("Appointment not found.");
  if (appointment.clinicId !== receptionist.clinicId) {
    throw new Error("You can only update appointments for your clinic.");
  }

  const allowed: AppointmentStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot set status to ${status}.`);
  }

  await updateAppointmentById(appointmentId, { status });
}

export async function rescheduleReceptionistAppointment(
  receptionistId: string,
  appointmentId: string,
  startAt: string,
  endAt: string,
) {
  const receptionist = await prisma.receptionist.findUnique({
    where: { id: receptionistId, endDate: null },
  });

  if (!receptionist) throw new Error("Receptionist not found.");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) throw new Error("Appointment not found.");
  if (appointment.clinicId !== receptionist.clinicId) {
    throw new Error("You can only update appointments for your clinic.");
  }

  if (
    ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)
  ) {
    throw new Error("Cannot reschedule a cancelled, completed, or no-show appointment.");
  }

  // Update existing appointment by ID (never creates a new one)
  await updateAppointmentById(appointmentId, { startAt, endAt });
}
