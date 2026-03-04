import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAppointments,
  createAppointment,
  getPatientsForSelect,
  getDoctorsForSelect,
  getClinicsForSelect,
} from "@/services/appointmentService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const list = searchParams.get("list");
    if (list === "options") {
      const [patients, doctors, clinics] = await Promise.all([
        getPatientsForSelect(),
        getDoctorsForSelect(),
        getClinicsForSelect(),
      ]);
      return NextResponse.json({ patients, doctors, clinics });
    }

    const status = searchParams.get("status") ?? undefined;
    const patientId = searchParams.get("patientId") ?? undefined;
    const doctorId = searchParams.get("doctorId") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const appointments = await getAppointments({
      status,
      patientId,
      doctorId,
      from,
      to,
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Admin appointments GET error", error);
    return NextResponse.json(
      { error: "Unable to load appointments." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createAppointment(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create appointment.";
    const status =
      message.includes("not found") || message.includes("must be")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
