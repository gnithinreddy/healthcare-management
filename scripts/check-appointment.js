const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { invoiceNumber: { contains: "INV-B5" } },
    include: { clinic: true, patient: { include: { person: true } } },
  });
  if (inv) {
    const rec = await prisma.receptionist.findFirst({ where: { endDate: null } });
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    console.log("Invoice:", inv.invoiceNumber, "| createdAt:", inv.createdAt, "| clinicId:", inv.clinicId);
    console.log("Receptionist clinic:", rec?.clinicId, "| Match:", inv.clinicId === rec?.clinicId);
    console.log("In 30d range:", inv.createdAt >= start30);
  }
  const all = await prisma.appointment.findMany({
    where: {
      patient: { person: { firstName: "John", lastName: "Doe" } },
      status: "COMPLETED",
    },
    include: {
      patient: { include: { person: true } },
      doctor: { include: { person: true } },
      invoice: true,
    },
    orderBy: { startAt: "desc" },
  });
  console.log("John Doe completed appointments:", all.length);
  for (const apt of all) {
    const idShort = apt.id.slice(-8);
    console.log("-", apt.startAt, "| Dr.", apt.doctor.person.firstName, apt.doctor.person.lastName, "| ID:", idShort, "| Invoice:", apt.invoice?.invoiceNumber ?? "NONE");
  }
  const martin = all.find((a) => a.doctor.person.lastName === "Martin");
  if (martin && !martin.invoice) {
    console.log("\nDr. Martin appointment has NO invoice - auto-invoice may not have run.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
