import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/models";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const account = await prisma.userAccount.findFirst({
      where: { email },
      include: {
        person: {
          include: {
            patient: true,
            pharmacist: true,
            doctor: true,
            receptionist: true,
          },
        },
        roles: { include: { role: true } },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, account.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const primaryRole = account.roles[0]?.role?.name ?? "PATIENT";
    const patientId = account.person?.patient?.id;
    const pharmacistId =
      account.person?.pharmacist?.endDate == null
        ? account.person?.pharmacist?.id
        : undefined;
    const doctorId =
      account.person?.doctor?.endDate == null
        ? account.person?.doctor?.id
        : undefined;
    const receptionistId =
      account.person?.receptionist?.endDate == null
        ? account.person?.receptionist?.id
        : undefined;

    const res = NextResponse.json({
      message: "Login successful.",
      user: {
        id: account.id,
        email: account.email ?? undefined,
        role: primaryRole,
        patientId: patientId ?? undefined,
        pharmacistId: pharmacistId ?? undefined,
        doctorId: doctorId ?? undefined,
        receptionistId: receptionistId ?? undefined,
        firstName: account.person?.firstName,
        lastName: account.person?.lastName,
      },
    });

    const cookieStore = await cookies();
    if (primaryRole === "PATIENT" && patientId) {
      cookieStore.set("patient_id", patientId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.delete("pharmacist_id");
      cookieStore.delete("doctor_id");
      cookieStore.delete("receptionist_id");
    } else if (primaryRole === "PHARMACIST" && pharmacistId) {
      cookieStore.set("pharmacist_id", pharmacistId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.delete("patient_id");
      cookieStore.delete("doctor_id");
      cookieStore.delete("receptionist_id");
    } else if (primaryRole === "DOCTOR" && doctorId) {
      cookieStore.set("doctor_id", doctorId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.delete("patient_id");
      cookieStore.delete("pharmacist_id");
      cookieStore.delete("receptionist_id");
    } else if (primaryRole === "RECEPTIONIST" && receptionistId) {
      cookieStore.set("receptionist_id", receptionistId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      cookieStore.delete("patient_id");
      cookieStore.delete("pharmacist_id");
      cookieStore.delete("doctor_id");
    } else {
      cookieStore.delete("patient_id");
      cookieStore.delete("pharmacist_id");
      cookieStore.delete("doctor_id");
      cookieStore.delete("receptionist_id");
    }

    return res;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      { error: "Something went wrong while logging in." },
      { status: 500 },
    );
  }
}
