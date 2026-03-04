import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAppointmentById,
  updateAppointmentById,
  deleteAppointmentById,
} from "@/services/appointmentService";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Admin appointment GET error", error);
    return NextResponse.json(
      { error: "Unable to load appointment." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    await updateAppointmentById(id, body ?? {});
    return NextResponse.json({ message: "Appointment updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment.";
    const status =
      message.includes("not found") || message.includes("must be")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteAppointmentById(id);
    return NextResponse.json({ message: "Appointment deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete appointment.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
