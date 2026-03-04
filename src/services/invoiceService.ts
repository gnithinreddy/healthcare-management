import { prisma } from "@/models";
import type { InvoiceStatus } from "@prisma/client";

/** Clinic default consultation fee when Doctor.consultationFee is not set */
const DEFAULT_CONSULTATION_FEE = 100;

function generateInvoiceNumber(): string {
  const prefix = "INV";
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

async function ensureUniqueInvoiceNumber(): Promise<string> {
  let num = generateInvoiceNumber();
  let exists = await prisma.invoice.findUnique({ where: { invoiceNumber: num } });
  while (exists) {
    num = generateInvoiceNumber();
    exists = await prisma.invoice.findUnique({ where: { invoiceNumber: num } });
  }
  return num;
}

function computeStatus(total: number, paid: number): InvoiceStatus {
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "DUE";
}

/**
 * Creates an invoice for a completed appointment.
 * Throws if invoice already exists for this appointment.
 */
export async function createInvoice(data: {
  patientId: string;
  clinicId: string;
  appointmentId: string;
  doctorId?: string | null;
  amount: number;
  description?: string;
}) {
  const { patientId, clinicId, appointmentId, doctorId, amount, description } = data;

  const existing = await prisma.invoice.findUnique({
    where: { appointmentId },
  });
  if (existing) throw new Error("Invoice already exists for this appointment.");

  const invoiceNumber = await ensureUniqueInvoiceNumber();
  const desc = description ?? "Consultation";
  const itemAmount = Math.max(0, amount);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      patientId,
      clinicId,
      appointmentId,
      doctorId: doctorId ?? null,
      status: "DUE",
      subtotal: itemAmount,
      discount: 0,
      total: itemAmount,
      paidAmount: 0,
      balance: itemAmount,
      items: {
        create: {
          description: desc,
          quantity: 1,
          unitPrice: itemAmount,
          amount: itemAmount,
        },
      },
    },
    include: { items: true },
  });

  return invoice;
}

/**
 * Idempotent: creates invoice for COMPLETED appointment if none exists.
 * Safe to call multiple times; returns existing invoice when present.
 */
export async function autoCreateInvoiceForAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: { include: { person: true } },
      clinic: true,
      invoice: true,
    },
  });

  if (!appointment) throw new Error("Appointment not found.");
  if (appointment.status !== "COMPLETED") {
    return null; // Only create for completed appointments
  }
  if (!appointment.clinicId) throw new Error("Appointment has no clinic.");

  if (appointment.invoice) return appointment.invoice; // idempotent: return existing

  const fee = appointment.doctor?.consultationFee ?? DEFAULT_CONSULTATION_FEE;
  const doctorName = appointment.doctor
    ? `Dr. ${appointment.doctor.person.firstName} ${appointment.doctor.person.lastName}`.trim()
    : "Consultation";

  try {
    return await createInvoice({
      patientId: appointment.patientId,
      clinicId: appointment.clinicId,
      appointmentId,
      doctorId: appointment.doctorId,
      amount: fee,
      description: doctorName,
    });
  } catch (e) {
    if (String(e).includes("already exists") || String(e).includes("Invoice already")) {
      const existing = await prisma.invoice.findUnique({ where: { appointmentId } });
      return existing;
    }
    throw e;
  }
}
