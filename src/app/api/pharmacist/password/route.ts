import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
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
      include: { person: true },
    });

    if (!pharmacist) {
      return NextResponse.json(
        { error: "Pharmacist not found." },
        { status: 404 },
      );
    }

    const account = await prisma.userAccount.findUnique({
      where: { personId: pharmacist.personId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.userAccount.update({
      where: { id: account.id },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Pharmacist password update error", error);
    return NextResponse.json(
      { error: "Unable to update password." },
      { status: 500 },
    );
  }
}
