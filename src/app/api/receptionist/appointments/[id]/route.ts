import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  updateReceptionistAppointmentStatus,
  rescheduleReceptionistAppointment,
} from "@/services/receptionistService";
import type { AppointmentStatus } from "@/services/appointmentService";

export async function PUT(
  request: Request,
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

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status, startAt, endAt } = body;

    if (startAt != null && endAt != null) {
      await rescheduleReceptionistAppointment(receptionistId, id, startAt, endAt);
      return NextResponse.json({ message: "Appointment rescheduled" });
    }

    const valid: AppointmentStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];
    if (!status || !valid.includes(status)) {
      return NextResponse.json(
        { error: "Valid status (CONFIRMED, NO_SHOW, CANCELLED) or startAt/endAt required." },
        { status: 400 },
      );
    }

    await updateReceptionistAppointmentStatus(receptionistId, id, status);

    return NextResponse.json({ message: "Appointment updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment.";
    const status =
      message.includes("not found") || message.includes("only update") || message.includes("Cannot reschedule") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
