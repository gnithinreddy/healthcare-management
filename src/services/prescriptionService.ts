import { prisma } from "@/models";

type PrescriptionItemInput = {
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  instructions?: string | null;
};

export async function createPrescriptionFromAppointment(
  doctorId: string,
  appointmentId: string,
  items: PrescriptionItemInput[],
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      encounter: { include: { prescriptions: true } },
      doctor: true,
    },
  });

  if (!appointment) throw new Error("Appointment not found.");
  if (appointment.doctorId !== doctorId) {
    throw new Error("You can only create prescriptions for your own appointments.");
  }
  if (appointment.status !== "COMPLETED") {
    throw new Error("Can only create prescriptions for completed appointments.");
  }
  if (items.length === 0) {
    throw new Error("At least one prescription item is required.");
  }

  // Create encounter if not exists
  let encounterId = appointment.encounter?.id;
  if (!encounterId) {
    const encounter = await prisma.encounter.create({
      data: {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      },
    });
    encounterId = encounter.id;
  } else if (appointment.encounter?.prescriptions?.length) {
    throw new Error("A prescription already exists for this appointment.");
  }

  const prescription = await prisma.prescription.create({
    data: {
      encounterId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      status: "CREATED",
      items: {
        create: items.map((i) => ({
          drugName: i.drugName.trim(),
          dosage: i.dosage?.trim() || null,
          frequency: i.frequency?.trim() || null,
          durationDays: i.durationDays ?? null,
          instructions: i.instructions?.trim() || null,
        })),
      },
    },
    include: { items: true },
  });

  return prescription;
}

export async function sendPrescriptionToPharmacy(
  doctorId: string,
  prescriptionId: string,
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { doctor: { include: { clinic: true } } },
  });

  if (!prescription) throw new Error("Prescription not found.");
  if (prescription.doctorId !== doctorId) {
    throw new Error("You can only send your own prescriptions.");
  }
  if (prescription.status === "SENT_TO_PHARMACY") {
    throw new Error("Prescription already sent to pharmacy.");
  }
  if (prescription.status === "DISPENSED") {
    throw new Error("Prescription already dispensed.");
  }

  const clinicId = prescription.doctor.clinicId;
  if (!clinicId) {
    throw new Error("Your clinic has no linked pharmacy.");
  }

  const pharmacies = await prisma.pharmacy.findMany({
    where: { clinicId },
  });

  if (pharmacies.length === 0) {
    throw new Error("No pharmacy linked to your clinic.");
  }

  await prisma.$transaction([
    ...pharmacies.map((pharmacy) =>
      prisma.dispenseRecord.create({
        data: {
          prescriptionId,
          pharmacyId: pharmacy.id,
          status: "IN_REVIEW",
        },
      }),
    ),
    prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: "SENT_TO_PHARMACY" },
    }),
  ]);

  return { success: true, pharmacyCount: pharmacies.length };
}
