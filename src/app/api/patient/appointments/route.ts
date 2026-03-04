import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getDoctorsForSelect,
  getClinicsForSelect,
  createAppointment,
} from "@/services/appointmentService";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;

    if (!patientId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const [doctors, clinics] = await Promise.all([
      getDoctorsForSelect(),
      getClinicsForSelect(),
    ]);

    return NextResponse.json({ doctors, clinics });
  } catch (error) {
    console.error("Patient appointments options error", error);
    return NextResponse.json(
      { error: "Unable to load options." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;

    if (!patientId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { doctorId, clinicId, startAt, endAt, reason } = body;

    if (!doctorId || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Doctor, start time, and end time are required." },
        { status: 400 },
      );
    }

    await createAppointment({
      patientId,
      doctorId,
      clinicId: clinicId || undefined,
      startAt,
      endAt,
      reason: reason || undefined,
      status: "REQUESTED",
    });

    return NextResponse.json({ message: "Appointment requested" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to book appointment.";
    const status =
      message.includes("not found") || message.includes("must be") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
