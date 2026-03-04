import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
    } = body ?? {};

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !dateOfBirth ||
      !gender
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    const existing = await prisma.userAccount.findFirst({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    let rolePatient = await prisma.role.findUnique({
      where: { name: "PATIENT" },
    });
    if (!rolePatient) {
      rolePatient = await prisma.role.create({
        data: { name: "PATIENT" },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const mrn = `MRN-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    const person = await prisma.person.create({
      data: {
        firstName,
        lastName,
        dob: new Date(dateOfBirth),
        sex: gender,
        email,
      },
    });

    const patient = await prisma.patient.create({
      data: {
        personId: person.id,
        mrn,
      },
    });

    const account = await prisma.userAccount.create({
      data: {
        personId: person.id,
        email,
        passwordHash,
        roles: {
          create: { roleId: rolePatient.id },
        },
      },
    });

    return NextResponse.json({ message: "Account created successfully." });
  } catch (error) {
    console.error("Signup error", error);
    return NextResponse.json(
      { error: "Something went wrong while creating the account." },
      { status: 500 },
    );
  }
}
