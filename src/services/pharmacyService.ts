import { prisma } from "@/models";

export async function getPharmacies() {
  const pharmacies = await prisma.pharmacy.findMany({
    include: {
      clinic: true,
      _count: {
        select: { pharmacists: true, inventory: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return pharmacies.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone ?? null,
    licenseNumber: p.licenseNumber ?? null,
    clinicName: p.clinic?.name ?? null,
    pharmacistCount: p._count.pharmacists,
    itemCount: p._count.inventory,
  }));
}

export async function getPharmacyById(id: string) {
  const p = await prisma.pharmacy.findUnique({
    where: { id },
    include: { clinic: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    phone: p.phone ?? null,
    licenseNumber: p.licenseNumber ?? null,
    clinicId: p.clinicId,
    clinicName: p.clinic?.name ?? null,
  };
}

export async function getInventory(pharmacyId?: string) {
  const where = pharmacyId ? { pharmacyId } : {};
  const items = await prisma.pharmacyInventory.findMany({
    where,
    include: { pharmacy: true },
    orderBy: [{ pharmacy: { name: "asc" } }, { drugName: "asc" }],
  });

  const now = new Date();
  return items.map((i) => ({
    id: i.id,
    pharmacyId: i.pharmacyId,
    pharmacyName: i.pharmacy.name,
    drugName: i.drugName,
    quantity: i.quantity,
    expiryDate: i.expiryDate,
    isLowStock: i.quantity < 10,
    isExpired: i.expiryDate ? i.expiryDate < now : false,
  }));
}

export async function createInventoryItem(data: {
  pharmacyId: string;
  drugName: string;
  quantity: number;
  expiryDate?: string;
}) {
  return prisma.pharmacyInventory.create({
    data: {
      pharmacyId: data.pharmacyId,
      drugName: data.drugName,
      quantity: data.quantity,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    },
  });
}

export async function updateInventoryItem(
  id: string,
  data: { quantity?: number; expiryDate?: string | null },
) {
  return prisma.pharmacyInventory.update({
    where: { id },
    data: {
      ...(data.quantity != null && { quantity: data.quantity }),
      ...(data.expiryDate !== undefined && {
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      }),
    },
  });
}

export async function deleteInventoryItem(id: string) {
  await prisma.pharmacyInventory.delete({ where: { id } });
}

export async function getDispenseRecords(pharmacyId?: string) {
  const where = pharmacyId ? { pharmacyId } : {};
  const records = await prisma.dispenseRecord.findMany({
    where,
    include: {
      pharmacy: true,
      prescription: {
        include: {
          patient: { include: { person: true } },
          doctor: { include: { person: true } },
        },
      },
      pharmacist: { include: { person: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return records.map((r) => ({
    id: r.id,
    pharmacyName: r.pharmacy.name,
    status: r.status,
    createdAt: r.createdAt,
    patientName: r.prescription.patient
      ? `${r.prescription.patient.person.firstName} ${r.prescription.patient.person.lastName}`.trim()
      : "—",
    pharmacistName: r.pharmacist
      ? `${r.pharmacist.person.firstName} ${r.pharmacist.person.lastName}`.trim()
      : null,
  }));
}
