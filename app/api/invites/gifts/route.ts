import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gifts = await prisma.gift.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(gifts);
}
