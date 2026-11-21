import { featureStatus } from "@content-engine/config";
import { getRepository } from "@content-engine/db";
import { NextResponse } from "next/server";

/** Liveness plus which integrations are configured (no secrets). */
export async function GET() {
  return NextResponse.json({ ok: true, service: "web", data: getRepository().kind, features: featureStatus() });
}
