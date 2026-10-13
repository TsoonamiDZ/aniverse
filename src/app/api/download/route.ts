import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

/** GET /api/download → serves the packaged project zip (aniqa-site.zip)
 * so the user can download the whole site + DB + sync tool from the UI. */
export async function GET() {
  const file = path.join(process.cwd(), "download", "aniqa-site.zip");
  if (!fs.existsSync(file)) {
    return NextResponse.json(
      { error: "package_not_built" },
      { status: 404 }
    );
  }
  const data = fs.readFileSync(file);
  // Bump the Content-Length via the buffer; set a friendly download filename.
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="aniqa-site.zip"',
      "Content-Length": String(data.length),
      "Cache-Control": "no-store",
    },
  });
}
