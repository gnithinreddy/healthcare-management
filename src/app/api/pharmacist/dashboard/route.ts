import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPharmacistDashboard } from "@/services/pharmacistService";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const pharmacistId = cookieStore.get("pharmacist_id")?.value;

    if (!pharmacistId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const data = await getPharmacistDashboard(pharmacistId);

    if (!data) {
      return NextResponse.json(
        { error: "Pharmacist not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Pharmacist dashboard error", error);
    return NextResponse.json(
      { error: "Unable to load dashboard." },
      { status: 500 },
    );
  }
}
