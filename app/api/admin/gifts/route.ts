import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string" ||
    !body.title.trim()
  ) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }
  const description =
    "description" in body && typeof body.description === "string"
      ? body.description
      : "";
  const link =
    "link" in body && typeof body.link === "string" && body.link.trim()
      ? body.link.trim()
      : null;
  const gift = await prisma.gift.create({
    data: { title: body.title.trim(), description, link },
  });
  return NextResponse.json(gift, { status: 201 });
}
