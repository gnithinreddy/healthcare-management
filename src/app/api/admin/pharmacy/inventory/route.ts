import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "@/services/pharmacyService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await createInventoryItem({
      pharmacyId: body.pharmacyId,
      drugName: body.drugName,
      quantity: body.quantity ?? 0,
      expiryDate: body.expiryDate,
    });
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add inventory item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
