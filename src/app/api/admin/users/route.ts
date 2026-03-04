import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAllUsers,
  getUserStats,
  createUser,
} from "@/services/adminService";

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get("role") ?? undefined;
    const [users, stats] = await Promise.all([
      getAllUsers(role),
      getUserStats(),
    ]);
    return NextResponse.json({ users, stats });
  } catch (error) {
    console.error("Admin users error", error);
    return NextResponse.json(
      { error: "Unable to load users." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createUser(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create user.";
    const status =
      message.includes("already exists") ? 409 :
      message.includes("Invalid") || message.includes("No clinic") || message.includes("No pharmacy") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

