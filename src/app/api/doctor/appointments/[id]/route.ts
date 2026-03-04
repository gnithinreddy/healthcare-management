import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDoctorAppointmentStatus } from "@/services/doctorService";
import type { AppointmentStatus } from "@/services/appointmentService";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const doctorId = cookieStore.get("doctor_id")?.value;

    if (!doctorId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status } = body;

    const valid: AppointmentStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];
    if (!status || !valid.includes(status)) {
      return NextResponse.json(
        { error: "Valid status (CONFIRMED, COMPLETED, NO_SHOW, CANCELLED) is required." },
        { status: 400 },
      );
    }

    await updateDoctorAppointmentStatus(doctorId, id, status);

    return NextResponse.json({ message: "Appointment updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment.";
    const status =
      message.includes("not found") || message.includes("only update") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
