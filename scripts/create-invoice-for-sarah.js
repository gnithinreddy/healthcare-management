/**
 * Create invoice for completed appointment without one.
 * Usage: node scripts/create-invoice-for-sarah.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_CONSULTATION_FEE = 100;

async function createInvoiceForAppointment(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true, clinic: true, invoice: true },
  });
  if (!appointment || appointment.status !== "COMPLETED") return null;
  if (appointment.invoice) return appointment.invoice;
  if (!appointment.clinicId) return null;

  const fee = appointment.doctor?.consultationFee ?? DEFAULT_CONSULTATION_FEE;
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  return prisma.invoice.create({
    data: {
      invoiceNumber,
      patientId: appointment.patientId,
      clinicId: appointment.clinicId,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      status: "DUE",
      subtotal: fee,
      discount: 0,
      total: fee,
      paidAmount: 0,
      balance: fee,
      items: {
        create: [{ description: "Consultation Fee", quantity: 1, unitPrice: fee, amount: fee }],
      },
    },
  });
}

async function main() {
  const patientName = process.argv[2] ? process.argv[2] + " " + (process.argv[3] || "") : "John Doe";
  const [first, last] = patientName.trim().split(/\s+/);
  const apt = await prisma.appointment.findFirst({
    where: {
      patient: { person: { firstName: first || "John", lastName: last || "Doe" } },
      status: "COMPLETED",
      invoice: null,
    },
    include: { patient: { include: { person: true } }, doctor: { include: { person: true } } },
    orderBy: { startAt: "desc" },
  });

  if (!apt) {
    console.log("No completed appointment without invoice found.");
    return;
  }

  console.log("Creating invoice for:", apt.patient.person.firstName, apt.patient.person.lastName, "| Dr.", apt.doctor.person.lastName, "|", apt.startAt);
  const invoice = await createInvoiceForAppointment(apt.id);
  console.log("Created:", invoice?.invoiceNumber, "| Total: $", invoice?.total);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
