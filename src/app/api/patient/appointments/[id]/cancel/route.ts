import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cancelPatientAppointment } from "@/services/patientService";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
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
    await cancelPatientAppointment(patientId, id);

    return NextResponse.json({ message: "Appointment cancelled" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to cancel appointment.";
    const status =
      message.includes("not found") ||
      message.includes("already") ||
      message.includes("Cannot") ||
      message.includes("only cancel")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
