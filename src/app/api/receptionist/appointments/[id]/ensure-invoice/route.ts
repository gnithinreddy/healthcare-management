import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";
import { autoCreateInvoiceForAppointment } from "@/services/invoiceService";

/**
 * POST /api/receptionist/appointments/[id]/ensure-invoice
 * Ensures an invoice exists for a COMPLETED appointment.
 * Idempotent - returns existing invoice if already created.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const receptionistId = cookieStore.get("receptionist_id")?.value;

    if (!receptionistId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const receptionist = await prisma.receptionist.findUnique({
      where: { id: receptionistId, endDate: null },
    });

    if (!receptionist) {
      return NextResponse.json(
        { error: "Receptionist not found." },
        { status: 404 },
      );
    }

    const { id: appointmentId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { invoice: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }
    if (appointment.clinicId !== receptionist.clinicId) {
      return NextResponse.json(
        { error: "You can only manage appointments for your clinic." },
        { status: 403 },
      );
    }

    const invoice = await autoCreateInvoiceForAppointment(appointmentId);
    if (!invoice) {
      return NextResponse.json(
        { error: "Could not create invoice. Appointment may not be completed." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      message: "Invoice ready",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to create invoice.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
