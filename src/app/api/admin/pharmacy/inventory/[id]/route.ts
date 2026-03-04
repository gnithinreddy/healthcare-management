import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateInventoryItem, deleteInventoryItem } from "@/services/pharmacyService";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    await updateInventoryItem(id, {
      quantity: body.quantity,
      expiryDate: body.expiryDate,
    });
    return NextResponse.json({ message: "Updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteInventoryItem(id);
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
