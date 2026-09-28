import { NextResponse } from "next/server";
import { isAdminSessionRequest } from "@/lib/admin-auth";

export async function GET(request: Request) {
  return NextResponse.json(await isAdminSessionRequest(request));
}
