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
    const patientId = cookieStore.get("patient_id")?.value;

    if (!patientId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, patientId },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 },
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
        { error: "Already checked in." },
        { status: 400 },
      );
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const apptDate = new Date(appointment.startAt);
    if (apptDate < startOfDay || apptDate > endOfDay) {
      return NextResponse.json(
        { error: "You can only check in for today's appointments." },
        { status: 400 },
      );
    }

    await prisma.$executeRaw`
      UPDATE Appointment SET checkedInAt = datetime('now') WHERE id = ${id}
    `;

    return NextResponse.json({ message: "Checked in successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error("Patient check-in error:", error);
    return NextResponse.json(
      { error: `Check-in failed: ${message}` },
      { status: 500 },
    );
  }
}
