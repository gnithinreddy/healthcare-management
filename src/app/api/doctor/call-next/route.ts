import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

export async function POST(_request: Request) {
  try {
    const cookieStore = await cookies();
    const doctorId = cookieStore.get("doctor_id")?.value;

    if (!doctorId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    await prisma.doctor.update({
      where: { id: doctorId },
      data: { callNextRequestedAt: new Date() },
    });

    return NextResponse.json({ message: "Next patient request sent." });
  } catch (error) {
    console.error("Doctor call-next error", error);
    return NextResponse.json(
      { error: "Unable to send request." },
      { status: 500 },
    );
  }
}
