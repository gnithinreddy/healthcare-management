import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/models";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const pharmacistId = cookieStore.get("pharmacist_id")?.value;

    if (!pharmacistId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    const pharmacist = await prisma.pharmacist.findUnique({
      where: { id: pharmacistId },
    });

    if (!pharmacist) {
      return NextResponse.json(
        { error: "Pharmacist not found." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      dateOfBirth,
      gender,
    } = body;

    await prisma.person.update({
      where: { id: pharmacist.personId },
      data: {
        ...(firstName != null && { firstName: String(firstName) }),
        ...(lastName != null && { lastName: String(lastName) }),
        ...(phone !== undefined && { phone: phone ? String(phone) : null }),
        ...(address1 !== undefined && { address1: address1 ? String(address1) : null }),
        ...(address2 !== undefined && { address2: address2 ? String(address2) : null }),
        ...(city !== undefined && { city: city ? String(city) : null }),
        ...(state !== undefined && { state: state ? String(state) : null }),
        ...(zip !== undefined && { zip: zip ? String(zip) : null }),
        ...(dateOfBirth !== undefined && {
          dob: dateOfBirth ? new Date(dateOfBirth) : null,
        }),
        ...(gender !== undefined && { sex: gender ? String(gender) : null }),
      },
    });

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Pharmacist profile update error", error);
    return NextResponse.json(
      { error: "Unable to update profile." },
      { status: 500 },
    );
  }
}
