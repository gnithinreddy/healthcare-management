import { NextResponse } from "next/server";
import { prisma } from "@/models";

export async function POST(request: Request) {
  try {
    const { userAccountId, message } = (await request.json()) ?? {};

    if (!userAccountId || !message) {
      return NextResponse.json(
        { error: "userAccountId and message are required." },
        { status: 400 },
      );
    }

    await prisma.feedback.create({
      data: {
        userAccountId,
        message,
      },
    });

    return NextResponse.json({ message: "Feedback submitted." });
  } catch (error) {
    console.error("Feedback error", error);
    return NextResponse.json(
      { error: "Unable to submit feedback." },
      { status: 500 },
    );
  }
}
