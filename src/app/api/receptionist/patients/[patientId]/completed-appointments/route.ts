import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

/**
 * GET /api/receptionist/patients/[patientId]/completed-appointments
 * Returns completed appointments for a patient, scoped to receptionist's clinic.
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

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
        clinicId: receptionist.clinicId,
        status: "COMPLETED",
      },
      include: {
        doctor: { include: { person: true } },
        clinic: true,
      },
      orderBy: { startAt: "desc" },
      take: 50,
    });

    const result = appointments.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      reason: a.reason ?? null,
      doctorName: `Dr. ${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
      clinicName: a.clinic?.name ?? null,
      consultationFee: a.doctor.consultationFee ?? null,
    }));

    const totalAmount = result.reduce(
      (sum, a) => sum + (a.consultationFee ?? 0),
      0,
    );

    return NextResponse.json({
      appointments: result,
      totalAmount,
    });
  } catch (error) {
    console.error("Patient completed appointments error", error);
    return NextResponse.json(
      { error: "Unable to load completed appointments." },
      { status: 500 },
    );
  }
}
