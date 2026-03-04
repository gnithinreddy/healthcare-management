import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("patient_id");
  cookieStore.delete("pharmacist_id");
  cookieStore.delete("doctor_id");
  cookieStore.delete("receptionist_id");
  return NextResponse.json({ message: "Logged out" });
}
