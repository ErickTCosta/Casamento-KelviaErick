import { NextResponse } from "next/server";
import { RSVPStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PersonResponse = { id: string; status: "GO" | "NO" };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body: unknown = await request.json();
  if (typeof body !== "object" || body === null || !("people" in body) || !Array.isArray(body.people)) {
    return NextResponse.json({ error: "Respostas inválidas" }, { status: 400 });
  }
  const people: PersonResponse[] = [];
  for (const person of body.people) {
    if (
      typeof person !== "object" ||
      person === null ||
      !("id" in person) ||
      typeof person.id !== "string" ||
      !("status" in person) ||
      (person.status !== "GO" && person.status !== "NO")
    ) {
      return NextResponse.json(
        { error: "Responda todas as pessoas." },
        { status: 400 },
      );
    }
    people.push({ id: person.id, status: person.status });
  }

  const message =
    "message" in body && typeof body.message === "string" ? body.message : null;
  const invite = await prisma.$transaction(async (transaction) => {
    const existingInvite = await transaction.invite.findUnique({
      where: { id },
      include: { people: { select: { id: true } } },
    });
    if (!existingInvite) return null;

    const responseIds = new Set(people.map((person) => person.id));
    if (
      responseIds.size !== people.length ||
      responseIds.size !== existingInvite.people.length ||
      existingInvite.people.some((person) => !responseIds.has(person.id))
    ) {
      return false;
    }

    const answeredAt = new Date();
    await Promise.all(
      people.map((person) =>
        transaction.person.update({
          where: { id: person.id, inviteId: id },
          data: {
            status: person.status as RSVPStatus,
            answeredAt,
          },
        }),
      ),
    );
    return transaction.invite.update({
      where: { id },
      data: { message, confirmed: true },
      include: { people: true },
    });
  });
  if (invite === null) {
    return NextResponse.json(
      { error: "Convite não encontrado." },
      { status: 404 },
    );
  }
  if (invite === false) {
    return NextResponse.json(
      { error: "Responda todas as pessoas do convite." },
      { status: 400 },
    );
  }
  return NextResponse.json(invite);
}
