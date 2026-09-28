import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  adminUser: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET as getSession } from "@/app/api/admin/auth/session/route";
import { POST as login } from "@/app/api/admin/auth/login/route";
import { POST as setup } from "@/app/api/admin/auth/setup/route";
import {
  ADMIN_USERNAME,
  createAdminSession,
  hashAdminPassword,
  isValidAdminSession,
  verifyAdminPassword,
  verifyAdminSetupToken,
} from "@/lib/admin-auth";

const setupToken = "test-setup-token";
const password = "correct-horse-battery";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin authentication", () => {
  beforeEach(() => {
    process.env.ADMIN_SETUP_TOKEN = setupToken;
    prismaMock.adminUser.create.mockReset();
    prismaMock.adminUser.findUnique.mockReset();
  });

  it("hashes the password with a per-password salt and verifies it", async () => {
    const firstHash = await hashAdminPassword(password);
    const secondHash = await hashAdminPassword(password);

    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).not.toContain(password);
    await expect(verifyAdminPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyAdminPassword("incorrect-password", firstHash)).resolves.toBe(false);
    await expect(verifyAdminPassword(password, "invalid-hash")).resolves.toBe(false);
  });

  it("compares the setup token without accepting a missing or incorrect token", () => {
    expect(verifyAdminSetupToken(setupToken)).toBe(true);
    expect(verifyAdminSetupToken("incorrect-token")).toBe(false);
    delete process.env.ADMIN_SETUP_TOKEN;
    expect(verifyAdminSetupToken(setupToken)).toBe(false);
  });

  it("creates the Erick account only with a valid token and matching strong password", async () => {
    prismaMock.adminUser.create.mockImplementation(
      async ({
        data,
      }: {
        data: { id: number; username: string; passwordHash: string };
      }) => data,
    );

    const response = await setup(
      jsonRequest("http://localhost/api/admin/auth/setup", {
        setupToken,
        password,
        confirmation: password,
      }),
    );
    const body = await response.json();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(body).toEqual({ authenticated: true, username: ADMIN_USERNAME });
    expect(prismaMock.adminUser.create).toHaveBeenCalledOnce();
    const createdAccount = prismaMock.adminUser.create.mock.calls[0][0].data;
    expect(createdAccount.username).toBe("Erick");
    expect(createdAccount.passwordHash).not.toContain(password);
    expect(cookie).toContain("HttpOnly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
    expect(cookie).toContain("admin_session=");
  });

  it.each([
    [{ setupToken: "wrong", password, confirmation: password }, 403],
    [{ setupToken, password, confirmation: "different-password" }, 400],
    [{ setupToken, password: "short", confirmation: "short" }, 400],
  ])("rejects an invalid initial setup request", async (body, status) => {
    const response = await setup(
      jsonRequest("http://localhost/api/admin/auth/setup", body),
    );

    expect(response.status).toBe(status);
    expect(prismaMock.adminUser.create).not.toHaveBeenCalled();
  });

  it("authenticates Erick and rejects an incorrect username or password", async () => {
    const passwordHash = await hashAdminPassword(password);
    prismaMock.adminUser.findUnique.mockResolvedValue({
      id: 1,
      username: "Erick",
      passwordHash,
    });

    const invalidUser = await login(
      jsonRequest("http://localhost/api/admin/auth/login", {
        username: "Other",
        password,
      }),
    );
    const invalidPassword = await login(
      jsonRequest("http://localhost/api/admin/auth/login", {
        username: "Erick",
        password: "incorrect-password",
      }),
    );
    const response = await login(
      jsonRequest("http://localhost/api/admin/auth/login", {
        username: " erick ",
        password,
      }),
    );

    expect(invalidUser.status).toBe(401);
    expect(invalidPassword.status).toBe(401);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("signs sessions, rejects tampering, and authenticates the session endpoint", async () => {
    const passwordHash = await hashAdminPassword(password);
    const token = createAdminSession(passwordHash);
    expect(isValidAdminSession(token, passwordHash)).toBe(true);
    expect(isValidAdminSession(`${token}tampered`, passwordHash)).toBe(false);
    expect(isValidAdminSession(undefined, passwordHash)).toBe(false);

    prismaMock.adminUser.findUnique.mockResolvedValue({
      id: 1,
      username: "Erick",
      passwordHash,
    });
    const response = await getSession(
      new Request("http://localhost/api/admin/auth/session", {
        headers: { cookie: `admin_session=${token}` },
      }),
    );

    expect(await response.json()).toEqual({
      authenticated: true,
      setupRequired: false,
      setupEnabled: true,
    });
  });
});
