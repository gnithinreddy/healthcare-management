import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

const SLOT_MINUTES = 30;

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
    const doctorId = searchParams.get("doctorId");
    const dateStr = searchParams.get("date");

    if (!doctorId || !dateStr) {
      return NextResponse.json(
        { error: "doctorId and date are required." },
        { status: 400 },
      );
    }

    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    if (receptionist.clinicId) {
      const doctor = await prisma.doctor.findFirst({
        where: { id: doctorId, clinicId: receptionist.clinicId },
      });
      if (!doctor) {
        return NextResponse.json(
          { error: "Doctor not in your clinic." },
          { status: 403 }
        );
      }
    }

    const dayOfWeek = date.getDay();
    const availability = await prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek },
      orderBy: { startTime: "asc" },
    });

    if (availability.length === 0) {
      return NextResponse.json({
        slots: [],
        message: "Doctor has no availability on this day.",
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: { in: ["REQUESTED", "CONFIRMED", "COMPLETED", "NO_SHOW"] },
        startAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const bookedRanges = existingAppointments.map((a) => ({
      start: a.startAt.getTime(),
      end: a.endAt.getTime(),
    }));

    const allSlots: { time: string; available: boolean }[] = [];

    for (const av of availability) {
      const [startH, startM] = av.startTime.split(":").map(Number);
      const [endH, endM] = av.endTime.split(":").map(Number);
      const slotStart = new Date(date);
      slotStart.setHours(startH, startM, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(endH, endM, 0, 0);

      let current = new Date(slotStart);
      while (current < slotEnd) {
        const slotEndTime = new Date(current.getTime() + SLOT_MINUTES * 60 * 1000);
        if (slotEndTime > slotEnd) break;

        const slotStartMs = current.getTime();
        const slotEndMs = slotEndTime.getTime();
        const isBooked = bookedRanges.some(
          (r) =>
            (slotStartMs >= r.start && slotStartMs < r.end) ||
            (slotEndMs > r.start && slotEndMs <= r.end) ||
            (slotStartMs <= r.start && slotEndMs >= r.end)
        );
        const isPast = slotStartMs < Date.now();

        const timeStr = `${current.getHours().toString().padStart(2, "0")}:${current.getMinutes().toString().padStart(2, "0")}`;
        if (!isPast) {
          allSlots.push({
            time: timeStr,
            available: !isBooked,
          });
        }

        current = slotEndTime;
      }
    }

    return NextResponse.json({
      slots: allSlots,
      appointmentCount: bookedRanges.length,
      limit: 10,
    });
  } catch (error) {
    console.error("Doctor slots error", error);
    return NextResponse.json(
      { error: "Unable to load slots." },
      { status: 500 },
    );
  }
}
