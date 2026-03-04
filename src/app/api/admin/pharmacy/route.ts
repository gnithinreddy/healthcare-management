import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPharmacies,
  getInventory,
  getDispenseRecords,
} from "@/services/pharmacyService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const view = searchParams.get("view") ?? "pharmacies";
    const pharmacyId = searchParams.get("pharmacyId") ?? undefined;

    if (view === "inventory") {
      const inventory = await getInventory(pharmacyId);
      return NextResponse.json({ inventory });
    }
    if (view === "dispenses") {
      const dispenses = await getDispenseRecords(pharmacyId);
      return NextResponse.json({ dispenses });
    }

    const pharmacies = await getPharmacies();
    return NextResponse.json({ pharmacies });
  } catch (error) {
    console.error("Admin pharmacy GET error", error);
    return NextResponse.json(
      { error: "Unable to load pharmacy data." },
      { status: 500 },
    );
  }
}
