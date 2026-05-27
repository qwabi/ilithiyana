import { type NextRequest, NextResponse } from "next/server";
import {
  buildReportStoragePath,
  uploadApplicationDocument,
} from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/** Node runtime — required for multipart File → Buffer uploads */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "File uploads are not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const leadId = (formData.get("leadId") as string)?.trim();
    const purpose = (formData.get("purpose") as string) || "report";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing lead identifier for upload" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be 10 MB or smaller" },
        { status: 400 },
      );
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and image files (JPEG, PNG, WebP) are allowed" },
        { status: 400 },
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath =
      purpose === "report"
        ? buildReportStoragePath(leadId, safeName)
        : `legacy/${purpose}/${leadId}/${Date.now()}-${safeName}`;

    // Buffer immediately so the request body is fully consumed once via formData()
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || undefined;

    const { path, url } = await uploadApplicationDocument(
      fileBuffer,
      storagePath,
      contentType,
    );

    return NextResponse.json({ url, path, pathname: path });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: message || "Failed to upload file. Please try again." },
      { status: 500 },
    );
  }
}
