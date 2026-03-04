import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDoctorDashboard } from "@/services/doctorService";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const doctorId = cookieStore.get("doctor_id")?.value;

    if (!doctorId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const data = await getDoctorDashboard(doctorId);

    if (!data) {
      return NextResponse.json(
        { error: "Doctor not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Doctor dashboard error", error);
    return NextResponse.json(
      { error: "Unable to load dashboard." },
      { status: 500 },
    );
  }
}
