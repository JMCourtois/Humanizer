import { NextRequest, NextResponse } from "next/server";

import { runHumanizerPipeline } from "@/lib/orchestrator";
import { createJob } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const inputText = typeof body?.inputText === "string" ? body.inputText.trim() : "";

  if (!inputText) {
    return NextResponse.json(
      { error: "inputText is required." },
      { status: 400 },
    );
  }

  const job = createJob(inputText);

  setTimeout(() => {
    void runHumanizerPipeline(job.id);
  }, 0);

  return NextResponse.json({ jobId: job.id }, { status: 201 });
}
