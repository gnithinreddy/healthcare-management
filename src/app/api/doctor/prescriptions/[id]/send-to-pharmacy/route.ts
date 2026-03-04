import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendPrescriptionToPharmacy } from "@/services/prescriptionService";

export async function POST(
  _request: Request,
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

    const { id: prescriptionId } = await params;

    const result = await sendPrescriptionToPharmacy(doctorId, prescriptionId);

    return NextResponse.json({
      message: `Prescription sent to ${result.pharmacyCount} pharmacy(ies).`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to send to pharmacy.";
    const status = msg.includes("not found") || msg.includes("already") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
