import { prisma } from "@/models";
import { getCheckedInAtMap } from "./checkedInHelper";

export async function getPatientDashboard(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      person: true,
      appointments: {
        include: {
          doctor: { include: { person: true } },
          clinic: true,
        },
        orderBy: { startAt: "desc" },
        take: 20,
      },
      prescriptions: {
        include: {
          doctor: { include: { person: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!patient) return null;

  const checkedInMap = await getCheckedInAtMap(patient.appointments.map((a) => a.id));
  const now = new Date();
  const upcoming = patient.appointments
    .filter(
      (a) =>
        a.startAt >= now &&
        (a.status === "REQUESTED" || a.status === "CONFIRMED"),
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const past = patient.appointments
    .filter(
      (a) =>
        a.startAt < now ||
        a.status === "CANCELLED" ||
        a.status === "COMPLETED" ||
        a.status === "NO_SHOW",
    )
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return {
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      firstName: patient.person.firstName,
      lastName: patient.person.lastName,
      email: patient.person.email ?? "",
      phone: patient.person.phone ?? "",
      address1: patient.person.address1 ?? "",
      address2: patient.person.address2 ?? "",
      city: patient.person.city ?? "",
      state: patient.person.state ?? "",
      zip: patient.person.zip ?? "",
      dateOfBirth: patient.person.dob,
      gender: patient.person.sex ?? "",
    },
    upcomingAppointments: upcoming.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      reason: a.reason ?? null,
      checkedInAt: (() => { const v = checkedInMap.get(a.id); return v ? v.toISOString() : null; })(),
      doctorName: `${a.doctor.person.firstName} ${a.doctor.person.lastName}`,
      clinicName: a.clinic?.name ?? null,
    })),
    pastAppointments: past.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      reason: a.reason ?? null,
      checkedInAt: (() => { const v = checkedInMap.get(a.id); return v ? v.toISOString() : null; })(),
      doctorName: `${a.doctor.person.firstName} ${a.doctor.person.lastName}`,
      clinicName: a.clinic?.name ?? null,
    })),
    prescriptions: patient.prescriptions.map((p) => ({
      id: p.id,
      status: p.status,
      createdAt: p.createdAt,
      doctorName: `${p.doctor.person.firstName} ${p.doctor.person.lastName}`,
      items: p.items.map((i) => ({
        drugName: i.drugName,
        dosage: i.dosage,
        frequency: i.frequency,
        instructions: i.instructions,
      })),
    })),
  };
}

export async function cancelPatientAppointment(
  patientId: string,
  appointmentId: string,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (appointment.patientId !== patientId) {
    throw new Error("You can only cancel your own appointments.");
  }

  if (appointment.status === "CANCELLED") {
    throw new Error("Appointment is already cancelled.");
  }

  if (appointment.startAt < new Date()) {
    throw new Error("Cannot cancel a past appointment.");
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });
}
