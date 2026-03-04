import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ patients: [] });
    }

    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const orConditions: Parameters<typeof prisma.patient.findMany>[0]["where"] =
      words.length === 1
        ? [
            { mrn: { contains: q } },
            { person: { firstName: { contains: q } } },
            { person: { lastName: { contains: q } } },
            { person: { phone: { contains: q } } },
            { person: { email: { contains: q } } },
          ]
        : words.flatMap((w) => [
            { mrn: { contains: w } },
            { person: { firstName: { contains: w } } },
            { person: { lastName: { contains: w } } },
          ]);

    let patients = await prisma.patient.findMany({
      where: { OR: orConditions },
      include: { person: true },
      orderBy: { person: { lastName: "asc" } },
      take: 50,
    });

    if (words.length >= 2) {
      const qLower = q.toLowerCase();
      patients = patients.filter((p) => {
        const first = (p.person.firstName ?? "").toLowerCase();
        const last = (p.person.lastName ?? "").toLowerCase();
        const full = `${first} ${last}`;
        const mrn = (p.mrn ?? "").toLowerCase();
        return full.includes(qLower) || words.every((w) => first.includes(w) || last.includes(w) || mrn.includes(w));
      });
    }

    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        mrn: p.mrn,
        firstName: p.person.firstName,
        lastName: p.person.lastName,
        fullName: `${p.person.firstName} ${p.person.lastName}`.trim(),
        phone: p.person.phone ?? null,
        email: p.person.email ?? null,
        dob: p.person.dob,
      })),
    });
  } catch (error) {
    console.error("Patient search error", error);
    return NextResponse.json(
      { error: "Unable to search patients." },
      { status: 500 },
    );
  }
}
