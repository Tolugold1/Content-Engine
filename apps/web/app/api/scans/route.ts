import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { reviews } from "@/lib/service";

/** POST /api/scans — asks the trend scout to run now. 202: the scan runs in the background. */
export async function POST() {
  return handle(async () => {
    await reviews().requestScan("dashboard");
    return NextResponse.json({ data: { requested: true } }, { status: 202 });
  });
}
