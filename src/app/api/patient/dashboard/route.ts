import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPatientDashboard } from "@/services/patientService";

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

    const data = await getPatientDashboard(patientId);

    if (!data) {
      return NextResponse.json(
        { error: "Patient not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Patient dashboard error", error);
    return NextResponse.json(
      { error: "Unable to load dashboard." },
      { status: 500 },
    );
  }
}
