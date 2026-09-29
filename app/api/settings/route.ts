import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { pixKey: true },
  });

  return NextResponse.json({ pixKey: setting?.pixKey ?? null });
}
