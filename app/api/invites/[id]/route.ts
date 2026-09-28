import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invite = await prisma.invite.findUnique({
    where: { id },
    include: { people: true },
  });
  if (!invite) {
    return NextResponse.json(
      { error: "Convite não encontrado" },
      { status: 404 },
    );
  }
  return NextResponse.json(invite);
}
