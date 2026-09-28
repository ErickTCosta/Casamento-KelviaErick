import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
export const ADMIN_USERNAME = "Erick";
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derivePasswordHash(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function verifyAdminSetupToken(token: string) {
  const expectedToken = process.env.ADMIN_SETUP_TOKEN;
  if (!expectedToken) return false;
  const submittedHash = createHash("sha256").update(token).digest();
  const expectedHash = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(submittedHash, expectedHash);
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16);
  const passwordHash = await derivePasswordHash(password, salt);
  return `scrypt$${salt.toString("base64url")}$${passwordHash.toString("base64url")}`;
}

export async function verifyAdminPassword(password: string, encodedHash: string) {
  const [algorithm, encodedSalt, encodedKey, ...extra] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedKey || extra.length > 0) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");
  if (salt.length !== 16 || expectedKey.length !== SCRYPT_KEY_LENGTH) return false;

  const submittedKey = await derivePasswordHash(password, salt);
  return timingSafeEqual(submittedKey, expectedKey);
}

export function createAdminSession(passwordHash: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const signature = createHmac("sha256", passwordHash)
    .update(`admin-session:${expiresAt}`)
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function isValidAdminSession(
  token: string | undefined,
  passwordHash: string,
) {
  if (!token) return false;

  const [expiresAt, signature, ...extra] = token.split(".");
  if (!expiresAt || !signature || extra.length > 0 || !/^\d+$/.test(expiresAt)) {
    return false;
  }

  const expiry = Number(expiresAt);
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createHmac("sha256", passwordHash)
    .update(`admin-session:${expiry}`)
    .digest();
  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }

  return (
    providedSignature.length === expectedSignature.length &&
    timingSafeEqual(providedSignature, expectedSignature)
  );
}

function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const sessionCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  return sessionCookie?.slice(ADMIN_SESSION_COOKIE.length + 1);
}

export async function isAdminRequest(request: Request) {
  const token = getSessionToken(request);
  if (!token) return false;

  const admin = await prisma.adminUser.findUnique({ where: { id: 1 } });
  return admin ? isValidAdminSession(token, admin.passwordHash) : false;
}

export async function isAdminSessionRequest(request: Request) {
  const token = getSessionToken(request);
  const admin = await prisma.adminUser.findUnique({ where: { id: 1 } });
  return {
    authenticated: admin ? isValidAdminSession(token, admin.passwordHash) : false,
    setupRequired: !admin,
    setupEnabled: Boolean(process.env.ADMIN_SETUP_TOKEN),
  };
}
