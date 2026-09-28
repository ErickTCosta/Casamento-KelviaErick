import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  ADMIN_USERNAME,
  createAdminSession,
  hashAdminPassword,
  verifyAdminSetupToken,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? body.password
      : undefined;
  const confirmation =
    typeof body === "object" && body !== null && "confirmation" in body
      ? body.confirmation
      : undefined;
  const setupToken =
    typeof body === "object" && body !== null && "setupToken" in body
      ? body.setupToken
      : undefined;

  if (
    typeof setupToken !== "string" ||
    !verifyAdminSetupToken(setupToken)
  ) {
    return NextResponse.json(
      { error: "Código de configuração inválido." },
      { status: 403 },
    );
  }
  if (
    typeof password !== "string" ||
    typeof confirmation !== "string" ||
    password !== confirmation
  ) {
    return NextResponse.json(
      { error: "As senhas não conferem." },
      { status: 400 },
    );
  }
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `A senha deve ter pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.` },
      { status: 400 },
    );
  }
  const passwordHash = await hashAdminPassword(password);
  let admin;
  try {
    admin = await prisma.adminUser.create({
      data: { id: 1, username: ADMIN_USERNAME, passwordHash },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A conta do administrador já foi configurada." },
        { status: 409 },
      );
    }
    throw error;
  }

  const response = NextResponse.json({
    authenticated: true,
    username: admin.username,
  });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSession(admin.passwordHash),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    },
  );
  return response;
}
