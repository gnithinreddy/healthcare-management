import { prisma } from "@/models";

/**
 * Fetches checkedInAt for appointments via raw SQL.
 * Required because Prisma client may not include checkedInAt if schema was updated without regenerate.
 */
export async function getCheckedInAtMap(
  appointmentIds: string[],
): Promise<Map<string, Date | null>> {
  if (appointmentIds.length === 0) return new Map();

  const placeholders = appointmentIds.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<{ id: string; checkedInAt: Date | null }[]>(
    `SELECT id, checkedInAt FROM Appointment WHERE id IN (${placeholders})`,
    ...appointmentIds,
  );
  const map = new Map<string, Date | null>();
  for (const r of rows) {
    map.set(r.id, r.checkedInAt);
  }
  return map;
}
