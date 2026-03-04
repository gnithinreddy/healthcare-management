import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updatePharmacistInventoryQuantity } from "@/services/pharmacistService";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const pharmacistId = cookieStore.get("pharmacist_id")?.value;

    if (!pharmacistId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const quantity = typeof body.quantity === "number" ? body.quantity : undefined;

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: "Valid quantity (number >= 0) is required." },
        { status: 400 },
      );
    }

    await updatePharmacistInventoryQuantity(pharmacistId, id, quantity);

    return NextResponse.json({ message: "Quantity updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update inventory.";
    const status =
      message.includes("not found") || message.includes("only update") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
