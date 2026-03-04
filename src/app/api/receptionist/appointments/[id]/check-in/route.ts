import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";
import { getCheckedInAtMap } from "@/services/checkedInHelper";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 },
      );
    }

    if (receptionist.clinicId && appointment.clinicId != null && appointment.clinicId !== receptionist.clinicId) {
      return NextResponse.json(
        { error: "Appointment not in your clinic." },
        { status: 403 },
      );
    }

    if (appointment.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only confirmed appointments can be checked in." },
        { status: 400 },
      );
    }

    const checkedInMap = await getCheckedInAtMap([id]);
    if (checkedInMap.get(id)) {
      return NextResponse.json(
        { error: "Patient already checked in." },
        { status: 400 },
      );
    }

    await prisma.$executeRaw`
      UPDATE Appointment SET checkedInAt = datetime('now') WHERE id = ${id}
    `;

    return NextResponse.json({ message: "Patient checked in successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error("Receptionist check-in error:", error);
    return NextResponse.json(
      { error: `Check-in failed: ${message}` },
      { status: 500 },
    );
  }
}
