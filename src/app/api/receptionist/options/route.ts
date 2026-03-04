import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";
import { getPatientsForSelect } from "@/services/appointmentService";

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
      include: { clinic: true },
    });

    if (!receptionist) {
      return NextResponse.json(
        { error: "Receptionist not found." },
        { status: 404 },
      );
    }

    const now = new Date();
    const [patients, clinicDoctors] = await Promise.all([
      getPatientsForSelect(),
      prisma.doctor.findMany({
        where: { endDate: null, clinicId: receptionist.clinicId },
        include: { person: true },
        orderBy: { person: { lastName: "asc" } },
      }),
    ]);

    const doctors =
      clinicDoctors.length > 0
        ? clinicDoctors
        : await prisma.doctor.findMany({
            where: { endDate: null },
            include: { person: true },
            orderBy: { person: { lastName: "asc" } },
            take: 20,
          });

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

    return NextResponse.json({
      patients: patients.map((p) => ({ id: p.id, label: p.label, mrn: p.mrn })),
      doctors: doctors.map((d) => {
        const count = countMap.get(d.id) ?? 0;
        const name = `Dr. ${d.person.firstName} ${d.person.lastName}`.trim();
        return {
          id: d.id,
          label: count >= 10 ? `${name} (full)` : `${name} (${count}/10)`,
          appointmentCount: count,
          full: count >= 10,
        };
      }),
      clinic: { id: receptionist.clinic.id, label: receptionist.clinic.name },
    });
  } catch (error) {
    console.error("Receptionist options error", error);
    return NextResponse.json(
      { error: "Unable to load options." },
      { status: 500 },
    );
  }
}
