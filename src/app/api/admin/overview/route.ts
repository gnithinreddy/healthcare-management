import { NextResponse } from "next/server";
import { getAdminOverview } from "@/services/adminService";

export async function GET() {
  try {
    const data = await getAdminOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin overview error", error);
    return NextResponse.json(
      { error: "Unable to load admin overview." },
      { status: 500 },
    );
  }
}

