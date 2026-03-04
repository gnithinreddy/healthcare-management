const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rec = await prisma.receptionist.findFirst({ where: { endDate: null } });
  const clinicId = rec?.clinicId;
  const where = { clinicId };
  
  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      patientId: true,
      createdAt: true,
      total: true,
      paidAmount: true,
      balance: true,
      status: true,
      appointmentId: true,
      doctorId: true,
      patient: {
        select: {
          mrn: true,
          person: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
      doctor: {
        select: {
          person: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  
  console.log("Invoices found:", invoices.length);
  invoices.forEach((inv) => {
    const name = `${inv.patient.person.firstName} ${inv.patient.person.lastName}`.trim();
    const doctorName = inv.doctor ? `Dr. ${inv.doctor.person.firstName} ${inv.doctor.person.lastName}`.trim() : null;
    console.log("-", inv.invoiceNumber, "|", name, "|", doctorName);
  });
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
