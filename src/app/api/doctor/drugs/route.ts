import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

/**
 * GET /api/doctor/drugs?q=tyle
 * Returns distinct drug names matching the search query for prescription autocomplete.
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const doctorId = cookieStore.get("doctor_id")?.value;

    if (!doctorId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return NextResponse.json({ drugs: [] });
    }

    const inventory = await prisma.pharmacyInventory.findMany({
      where: {
        drugName: { contains: q },
      },
      select: { drugName: true },
      distinct: ["drugName"],
      take: 20,
      orderBy: { drugName: "asc" },
    });

    const drugs = inventory.map((r) => r.drugName);

    return NextResponse.json({ drugs });
  } catch (error) {
    console.error("Doctor drugs search error", error);
    return NextResponse.json(
      { error: "Unable to search drugs." },
      { status: 500 },
    );
  }
}
