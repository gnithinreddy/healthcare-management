import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

/**
 * GET /api/receptionist/patients/[patientId]/profile
 * Returns full patient profile: details, upcoming appointments, past appointments, billing info.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const receptionistId = cookieStore.get("receptionist_id")?.value;

    if (!receptionistId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const receptionist = await prisma.receptionist.findUnique({
      where: { id: receptionistId, endDate: null },
    });

    if (!receptionist) {
      return NextResponse.json(
        { error: "Receptionist not found." },
        { status: 404 },
      );
    }

    const { patientId } = await params;
    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required." },
        { status: 400 },
      );
    }

    const clinicId = receptionist.clinicId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [patient, appointments] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: { person: true },
      }),
      prisma.appointment.findMany({
        where: {
          patientId,
          clinicId,
        },
        include: {
          doctor: { include: { person: true } },
          clinic: true,
        },
        orderBy: { startAt: "desc" },
        take: 100,
      }),
    ]);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found." },
        { status: 404 },
      );
    }

    const mapAppointment = (a: (typeof appointments)[0]) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      reason: a.reason ?? null,
      doctorName: `Dr. ${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
      clinicName: a.clinic?.name ?? null,
    });

    const upcoming = appointments
      .filter(
        (a) =>
          a.startAt >= startOfToday &&
          (a.status === "REQUESTED" || a.status === "CONFIRMED"),
      )
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map(mapAppointment);

    const past = appointments
      .filter(
        (a) =>
          a.startAt < startOfToday ||
          ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status),
      )
      .map(mapAppointment);

    const completed = appointments
      .filter((a) => a.status === "COMPLETED")
      .map((a) => ({
        id: a.id,
        startAt: a.startAt,
        doctorName: `Dr. ${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
        consultationFee: a.doctor.consultationFee ?? null,
      }));

    const totalAmount = completed.reduce(
      (sum, a) => sum + (a.consultationFee ?? 0),
      0,
    );

    return NextResponse.json({
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        status: patient.status,
        firstName: patient.person.firstName,
        lastName: patient.person.lastName,
        fullName: `${patient.person.firstName} ${patient.person.lastName}`.trim(),
        dob: patient.person.dob,
        sex: patient.person.sex ?? null,
        phone: patient.person.phone ?? null,
        email: patient.person.email ?? null,
        address1: patient.person.address1 ?? null,
        address2: patient.person.address2 ?? null,
        city: patient.person.city ?? null,
        state: patient.person.state ?? null,
        zip: patient.person.zip ?? null,
      },
      upcomingAppointments: upcoming,
      pastAppointments: past,
      billing: {
        completedAppointments: completed,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Patient profile error", error);
    return NextResponse.json(
      { error: "Unable to load patient profile." },
      { status: 500 },
    );
  }
}
