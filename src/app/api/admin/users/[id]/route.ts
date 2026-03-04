import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getUserById,
  updateUserById,
  deleteUserById,
} from "@/services/adminService";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin user GET error", error);
    return NextResponse.json(
      { error: "Unable to load user." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    await updateUserById(id, body ?? {});
    return NextResponse.json({ message: "User updated" });
  } catch (error) {
    console.error("Admin user PUT error", error);
    return NextResponse.json(
      { error: "Unable to update user." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteUserById(id);
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("Admin user DELETE error", error);
    return NextResponse.json(
      { error: "Unable to delete user." },
      { status: 500 },
    );
  }
}

