import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

export async function GET() {
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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const recentThreshold = new Date(Date.now() - 10 * 60 * 1000);

    const doctors = await prisma.doctor.findMany({
      where: {
        endDate: null,
        clinicId: receptionist.clinicId,
        callNextRequestedAt: { gte: recentThreshold },
      },
      include: { person: true },
    });

    const callNextInfo = await Promise.all(
      doctors.map(async (d) => {
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

    return NextResponse.json({ callNextInfo });
  } catch (error) {
    console.error("Call-next error", error);
    return NextResponse.json(
      { error: "Unable to load." },
      { status: 500 },
    );
  }
}
