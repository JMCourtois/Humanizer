import { NextResponse } from "next/server";

import { getJobSnapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = getJobSnapshot(id);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(job, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
