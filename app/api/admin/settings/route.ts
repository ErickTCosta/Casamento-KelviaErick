import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("coupleName" in body) ||
    typeof body.coupleName !== "string" ||
    !body.coupleName.trim()
  ) {
    return NextResponse.json(
      { error: "Informe o nome dos noivos." },
      { status: 400 },
    );
  }
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: { coupleName: body.coupleName.trim() },
    create: { id: 1, coupleName: body.coupleName.trim() },
  });
  return NextResponse.json(setting);
}
