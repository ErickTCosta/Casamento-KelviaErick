import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const [invites, gifts] = await Promise.all([
    prisma.invite.findMany({
      include: { people: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gift.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return NextResponse.json({ invites, gifts });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("label" in body) ||
    !("names" in body) ||
    typeof body.label !== "string" ||
    typeof body.names !== "string"
  ) {
    return NextResponse.json(
      { error: "Informe rótulo e nomes." },
      { status: 400 },
    );
  }
  const names = body.names
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (!body.label.trim() || names.length === 0) {
    return NextResponse.json(
      { error: "Informe rótulo e nomes." },
      { status: 400 },
    );
  }
  const invite = await prisma.invite.create({
    data: {
      label: body.label.trim(),
      people: { create: names.map((name) => ({ name })) },
    },
    include: { people: true },
  });
  return NextResponse.json(invite, { status: 201 });
}
