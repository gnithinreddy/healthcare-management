import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPrescriptionFromAppointment } from "@/services/prescriptionService";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const doctorId = cookieStore.get("doctor_id")?.value;

    if (!doctorId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { appointmentId, items } = body;

    if (!appointmentId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Appointment ID and items array are required." },
        { status: 400 },
      );
    }

    const prescription = await createPrescriptionFromAppointment(
      doctorId,
      appointmentId,
      items,
    );

    return NextResponse.json({
      id: prescription.id,
      status: prescription.status,
      items: prescription.items,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to create prescription.";
    const status = msg.includes("not found") || msg.includes("already exists") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
