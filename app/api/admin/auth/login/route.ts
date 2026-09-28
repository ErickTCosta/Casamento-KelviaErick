import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  ADMIN_USERNAME,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const username =
    typeof body === "object" && body !== null && "username" in body
      ? body.username
      : undefined;
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? body.password
      : undefined;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim().toLocaleLowerCase("pt-BR") !==
      ADMIN_USERNAME.toLocaleLowerCase("pt-BR")
  ) {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos." },
      { status: 401 },
    );
  }
  const admin = await prisma.adminUser.findUnique({ where: { id: 1 } });
  if (
    !admin ||
    !(await verifyAdminPassword(password, admin.passwordHash))
  ) {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos." },
      { status: 401 },
    );
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
