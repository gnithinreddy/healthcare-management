import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";
import { getCheckedInAtMap } from "@/services/checkedInHelper";
import { createAppointment } from "@/services/appointmentService";

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
    const doctorId = searchParams.get("doctorId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const where: Record<string, unknown> = { clinicId: receptionist.clinicId };

    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.startAt = dateFilter;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true } },
        clinic: true,
      },
      orderBy: { startAt: "desc" },
      take: 200,
    });

    let filtered = appointments;
    if (search) {
      filtered = appointments.filter((a) => {
        const name = `${a.patient.person.firstName} ${a.patient.person.lastName}`.toLowerCase();
        const mrn = a.patient.mrn.toLowerCase();
        return name.includes(search) || mrn.includes(search);
      });
    }

    const checkedInMap = await getCheckedInAtMap(filtered.map((a) => a.id));
    const result = filtered.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      reason: a.reason ?? null,
      checkedInAt: (checkedInMap.get(a.id) ?? a.checkedInAt)?.toISOString() ?? null,
      patientName: `${a.patient.person.firstName} ${a.patient.person.lastName}`.trim(),
      patientMrn: a.patient.mrn,
      patientId: a.patientId,
      doctorId: a.doctorId,
      doctorName: `Dr. ${a.doctor.person.firstName} ${a.doctor.person.lastName}`.trim(),
      clinicName: a.clinic?.name ?? null,
    }));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const today = result.filter(
      (a) =>
        new Date(a.startAt) >= startOfToday &&
        new Date(a.startAt) < endOfToday &&
        a.status !== "CANCELLED",
    );
    const upcoming = result.filter(
      (a) =>
        new Date(a.startAt) >= endOfToday &&
        (a.status === "REQUESTED" || a.status === "CONFIRMED"),
    );
    const past = result.filter(
      (a) =>
        new Date(a.startAt) < endOfToday ||
        a.status === "CANCELLED" ||
        a.status === "COMPLETED" ||
        a.status === "NO_SHOW",
    );

    return NextResponse.json({
      todayAppointments: today.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
      upcomingAppointments: upcoming.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
      pastAppointments: past.sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      ),
    });
  } catch (error) {
    console.error("Receptionist appointments error", error);
    return NextResponse.json(
      { error: "Unable to load appointments." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { patientId, doctorId, startAt, endAt, reason } = body;

    if (!patientId || !doctorId || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Patient, doctor, start time, and end time are required." },
        { status: 400 },
      );
    }

    await createAppointment({
      patientId,
      doctorId,
      clinicId: receptionist.clinicId,
      startAt,
      endAt,
      reason: reason || undefined,
      status: "CONFIRMED",
    });

    return NextResponse.json({ message: "Appointment booked" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to book appointment.";
    const status = msg.includes("not found") || msg.includes("must be") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
