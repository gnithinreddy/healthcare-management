import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

/**
 * GET /api/patient/billing
 * Returns the logged-in patient's invoices.
 */
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

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found. Please log in again." },
        { status: 401 },
      );
    }

    const invoices = await prisma.invoice.findMany({
      where: { patientId, status: { not: "VOID" } },
      include: {
        items: true,
        payments: true,
        doctor: { include: { person: true } },
        clinic: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalDue = invoices.reduce(
      (sum, inv) => sum + (typeof inv.balance === "number" ? inv.balance : 0),
      0,
    );

    const result = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      paidAmount: inv.paidAmount,
      balance: inv.balance,
      items: (inv.items ?? []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
      doctorName:
        inv.doctor?.person != null
          ? `Dr. ${inv.doctor.person.firstName} ${inv.doctor.person.lastName}`.trim()
          : null,
      clinicName: inv.clinic?.name ?? null,
      createdAt: inv.createdAt,
    }));

    return NextResponse.json({
      invoices: result,
      totalDue,
    });
  } catch (error) {
    console.error("Patient billing error", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to load billing.",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 },
    );
  }
}
