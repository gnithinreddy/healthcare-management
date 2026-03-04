import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

const SLOTS_PER_DOCTOR = 10;

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId") || undefined;

    const now = new Date();

    // Get clinic doctors (or all if no clinic filter)
    const doctorWhere: Record<string, unknown> = { endDate: null };
    if (doctorId) {
      doctorWhere.id = doctorId;
    } else if (receptionist.clinicId) {
      doctorWhere.clinicId = receptionist.clinicId;
    }

    const doctors = await prisma.doctor.findMany({
      where: doctorWhere,
      include: { person: true },
      orderBy: { person: { lastName: "asc" } },
    });

    if (doctors.length === 0) {
      return NextResponse.json({
        availability: [],
        totalAvailable: 0,
      });
    }

    const appointmentCounts = await prisma.appointment.groupBy({
      by: ["doctorId"],
      where: {
        doctorId: { in: doctors.map((d) => d.id) },
        status: { in: ["REQUESTED", "CONFIRMED"] },
        startAt: { gte: now },
      },
      _count: { id: true },
    });
    const countMap = new Map(
      appointmentCounts.map((c) => [c.doctorId, c._count.id])
    );

    let totalAvailable = 0;
    const availability = doctors.map((d) => {
      const booked = countMap.get(d.id) ?? 0;
      const available = Math.max(0, SLOTS_PER_DOCTOR - booked);
      totalAvailable += available;
      return {
        doctorId: d.id,
        doctorName: `Dr. ${d.person.firstName} ${d.person.lastName}`.trim(),
        department: d.specialization ?? null,
        booked,
        limit: SLOTS_PER_DOCTOR,
        available,
      };
    });

    return NextResponse.json({
      availability,
      totalAvailable,
    });
  } catch (error) {
    console.error("Doctor availability error", error);
    return NextResponse.json(
      { error: "Unable to load availability." },
      { status: 500 },
    );
  }
}
