import { prisma } from "@/models";
import { getInventory, updateInventoryItem } from "./pharmacyService";

async function getPharmacistDispenses(pharmacyId: string) {
  const records = await prisma.dispenseRecord.findMany({
    where: { pharmacyId },
    include: {
      prescription: {
        include: {
          patient: { include: { person: true } },
          doctor: { include: { person: true } },
          items: true,
        },
      },
      pharmacist: { include: { person: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return records.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    patientName: `${r.prescription.patient.person.firstName} ${r.prescription.patient.person.lastName}`.trim(),
    doctorName: `Dr. ${r.prescription.doctor.person.firstName} ${r.prescription.doctor.person.lastName}`.trim(),
    pharmacistName: r.pharmacist
      ? `${r.pharmacist.person.firstName} ${r.pharmacist.person.lastName}`.trim()
      : null,
    drugs: r.prescription.items.map((i) => ({
      drugName: i.drugName,
      dosage: i.dosage,
      frequency: i.frequency,
      instructions: i.instructions,
    })),
  }));
}

export async function getPharmacistDashboard(pharmacistId: string) {
  const pharmacist = await prisma.pharmacist.findUnique({
    where: { id: pharmacistId, endDate: null },
    include: {
      person: true,
      pharmacy: { include: { clinic: true } },
    },
  });

  if (!pharmacist) return null;

  const pharmacyId = pharmacist.pharmacyId;
  const [inventory, dispenses] = await Promise.all([
    getInventory(pharmacyId),
    getPharmacistDispenses(pharmacyId),
  ]);

  const now = new Date();
  const lowStockCount = inventory.filter((i) => i.quantity < 10).length;
  const expiredCount = inventory.filter(
    (i) => i.expiryDate && i.expiryDate < now,
  ).length;
  const pendingDispenses = dispenses.filter(
    (d) => d.status === "IN_REVIEW",
  ).length;

  return {
    pharmacist: {
      id: pharmacist.id,
      firstName: pharmacist.person.firstName,
      lastName: pharmacist.person.lastName,
      licenseNumber: pharmacist.licenseNumber ?? null,
    },
    profile: {
      firstName: pharmacist.person.firstName,
      lastName: pharmacist.person.lastName,
      email: pharmacist.person.email ?? "",
      phone: pharmacist.person.phone ?? "",
      address1: pharmacist.person.address1 ?? "",
      address2: pharmacist.person.address2 ?? "",
      city: pharmacist.person.city ?? "",
      state: pharmacist.person.state ?? "",
      zip: pharmacist.person.zip ?? "",
      dateOfBirth: pharmacist.person.dob,
      gender: pharmacist.person.sex ?? "",
      licenseNumber: pharmacist.licenseNumber ?? "",
    },
    pharmacy: {
      id: pharmacist.pharmacy.id,
      name: pharmacist.pharmacy.name,
      phone: pharmacist.pharmacy.phone ?? null,
      clinicName: pharmacist.pharmacy.clinic?.name ?? null,
    },
    inventory,
    dispenses,
    stats: {
      inventoryCount: inventory.length,
      lowStockCount,
      expiredCount,
      pendingDispenses,
    },
  };
}

export async function updatePharmacistDispenseStatus(
  pharmacistId: string,
  dispenseId: string,
  status: "DISPENSED" | "OUT_OF_STOCK" | "IN_REVIEW",
) {
  const pharmacist = await prisma.pharmacist.findUnique({
    where: { id: pharmacistId, endDate: null },
  });

  if (!pharmacist) throw new Error("Pharmacist not found.");

  const dispense = await prisma.dispenseRecord.findUnique({
    where: { id: dispenseId },
  });

  if (!dispense) throw new Error("Dispense record not found.");
  if (dispense.pharmacyId !== pharmacist.pharmacyId) {
    throw new Error("You can only update dispenses for your pharmacy.");
  }

  await prisma.dispenseRecord.update({
    where: { id: dispenseId },
    data: { status, pharmacistId },
  });

  if (status === "DISPENSED") {
    await prisma.prescription.update({
      where: { id: dispense.prescriptionId },
      data: { status: "DISPENSED" },
    });
  } else if (status === "OUT_OF_STOCK") {
    await prisma.prescription.update({
      where: { id: dispense.prescriptionId },
      data: { status: "OUT_OF_STOCK" },
    });
  }
}

export async function updatePharmacistInventoryQuantity(
  pharmacistId: string,
  inventoryId: string,
  quantity: number,
) {
  const pharmacist = await prisma.pharmacist.findUnique({
    where: { id: pharmacistId, endDate: null },
  });

  if (!pharmacist) throw new Error("Pharmacist not found.");

  const item = await prisma.pharmacyInventory.findUnique({
    where: { id: inventoryId },
  });

  if (!item) throw new Error("Inventory item not found.");
  if (item.pharmacyId !== pharmacist.pharmacyId) {
    throw new Error("You can only update inventory for your pharmacy.");
  }

  await updateInventoryItem(inventoryId, { quantity });
}
