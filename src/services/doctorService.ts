import { prisma } from "@/models";
import { updateAppointmentById } from "./appointmentService";
import type { AppointmentStatus } from "./appointmentService";

export async function getDoctorDashboard(doctorId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId, endDate: null },
    include: {
      person: true,
      clinic: true,
      appointments: {
        include: {
          patient: { include: { person: true } },
          clinic: true,
          encounter: { include: { prescriptions: { take: 1, orderBy: { createdAt: "desc" } } } },
        },
        orderBy: { startAt: "desc" },
        take: 50,
      },
    },
  });

  if (!doctor) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const todayAppointments = doctor.appointments.filter(
    (a) =>
      a.startAt >= startOfToday &&
      a.startAt < endOfToday &&
      a.status !== "CANCELLED",
  );
  const upcoming = doctor.appointments.filter(
    (a) =>
      a.startAt >= endOfToday &&
      (a.status === "REQUESTED" || a.status === "CONFIRMED"),
  );
  const past = doctor.appointments.filter(
    (a) =>
      a.startAt < startOfToday ||
      a.status === "CANCELLED" ||
      a.status === "COMPLETED" ||
      a.status === "NO_SHOW",
  );

  const mapAppointment = (a: (typeof doctor.appointments)[0]) => {
    const prescription = a.encounter?.prescriptions?.[0];
    return {
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      reason: a.reason ?? null,
      patientName: `${a.patient.person.firstName} ${a.patient.person.lastName}`.trim(),
      patientMrn: a.patient.mrn,
      clinicName: a.clinic?.name ?? null,
      prescriptionId: prescription?.id ?? null,
      prescriptionStatus: prescription?.status ?? null,
    };
  };

  return {
    doctor: {
      id: doctor.id,
      firstName: doctor.person.firstName,
      lastName: doctor.person.lastName,
      specialization: doctor.specialization ?? null,
      licenseNumber: doctor.licenseNumber ?? null,
      consultationFee: doctor.consultationFee ?? null,
    },
    clinic: doctor.clinic
      ? {
          id: doctor.clinic.id,
          name: doctor.clinic.name,
          phone: doctor.clinic.phone ?? null,
        }
      : null,
    profile: {
      firstName: doctor.person.firstName,
      lastName: doctor.person.lastName,
      email: doctor.person.email ?? "",
      phone: doctor.person.phone ?? "",
      address1: doctor.person.address1 ?? "",
      address2: doctor.person.address2 ?? "",
      city: doctor.person.city ?? "",
      state: doctor.person.state ?? "",
      zip: doctor.person.zip ?? "",
      dateOfBirth: doctor.person.dob,
      gender: doctor.person.sex ?? "",
      licenseNumber: doctor.licenseNumber ?? "",
      specialization: doctor.specialization ?? "",
      consultationFee: doctor.consultationFee ?? null,
    },
    todayAppointments: todayAppointments.sort(
      (a, b) => a.startAt.getTime() - b.startAt.getTime(),
    ).map(mapAppointment),
    upcomingAppointments: upcoming
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map(mapAppointment),
    pastAppointments: past
      .sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
      .map(mapAppointment),
  };
}

export async function updateDoctorAppointmentStatus(
  doctorId: string,
  appointmentId: string,
  status: AppointmentStatus,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) throw new Error("Appointment not found.");
  if (appointment.doctorId !== doctorId) {
    throw new Error("You can only update your own appointments.");
  }

  const allowed: AppointmentStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot set status to ${status}.`);
  }

  await updateAppointmentById(appointmentId, { status });
}
