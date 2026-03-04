import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getReceptionistDashboard } from "@/services/receptionistService";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const receptionistId = cookieStore.get("receptionist_id")?.value;

    if (!receptionistId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const data = await getReceptionistDashboard(receptionistId);

    if (!data) {
      return NextResponse.json(
        { error: "Receptionist not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Receptionist dashboard error", error);
    return NextResponse.json(
      { error: "Unable to load dashboard." },
      { status: 500 },
    );
  }
}
