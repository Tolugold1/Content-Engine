import { ReviewConflictError, ReviewRuleError } from "@content-engine/core";
import { DraftNotFoundError } from "@content-engine/db";
import { MissingConfigError } from "@content-engine/config";
import { NextResponse } from "next/server";
import { z } from "zod";

/** JSON error body in the RFC 9457 "problem details" shape. */
function problem(status: number, title: string, detail?: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ type: "about:blank", title, status, ...(detail ? { detail } : {}), ...extra }, { status });
}

/** Maps domain errors to HTTP statuses so every endpoint answers the same way. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ReviewConflictError) return problem(409, "Already reviewed", error.message, { review: error.existing });
  if (error instanceof ReviewRuleError) return problem(422, "Not allowed", error.message);
  if (error instanceof DraftNotFoundError) return problem(404, "Draft not found", error.message);
  if (error instanceof z.ZodError) return problem(400, "Invalid request", undefined, { issues: error.issues });
  if (error instanceof SyntaxError) return problem(400, "Invalid JSON body");
  if (error instanceof MissingConfigError) return problem(503, "Not configured", error.message);
  console.error("[api]", error);
  return problem(500, "Internal error");
}

export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  return schema.parse(await request.json());
}

/** A short message for the dashboard's server actions (same mapping as the API). */
export function describeError(error: unknown): string {
  if (error instanceof ReviewConflictError || error instanceof ReviewRuleError || error instanceof MissingConfigError) return error.message;
  if (error instanceof DraftNotFoundError) return "That draft no longer exists.";
  if (error instanceof z.ZodError) return "That input doesn't look right.";
  console.error("[action]", error);
  return "Something went wrong. Try again.";
}

export { problem };
