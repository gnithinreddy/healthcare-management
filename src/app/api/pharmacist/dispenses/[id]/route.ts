import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updatePharmacistDispenseStatus } from "@/services/pharmacistService";

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
    const { status } = body;

    if (!status || !["DISPENSED", "OUT_OF_STOCK", "IN_REVIEW"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status (DISPENSED, OUT_OF_STOCK, IN_REVIEW) is required." },
        { status: 400 },
      );
    }

    await updatePharmacistDispenseStatus(
      pharmacistId,
      id,
      status as "DISPENSED" | "OUT_OF_STOCK" | "IN_REVIEW",
    );

    return NextResponse.json({ message: "Status updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update dispense.";
    const status =
      message.includes("not found") || message.includes("only update") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
