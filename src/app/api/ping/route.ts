import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/ping → lightweight keep-alive (no DB). Keeps the dev server
 * from being idle-reaped while the preview panel is open. */
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
