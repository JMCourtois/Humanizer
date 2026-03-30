import "server-only";

import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M2.7";

export interface MiniMaxPromptConfig<T> {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  temperature?: number;
  transform?: (value: unknown) => T;
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env.local before running Humanizer Lab.",
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
  });
}

function stripMarkdownFences(content: string): string {
  return content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonResponse(content: string, schemaName: string): unknown {
  const cleaned = stripMarkdownFences(content);

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(
      `MiniMax returned invalid JSON for ${schemaName}: ${reason}. Raw response: ${cleaned.slice(
        0,
        400,
      )}`,
    );
  }
}

export async function runMiniMax<T>({
  systemPrompt,
  userPrompt,
  schemaName,
  temperature = 0.2,
  transform,
}: MiniMaxPromptConfig<T>): Promise<T> {
  const completion = await getClient().chat.completions.create({
    model: process.env.MINIMAX_MODEL || DEFAULT_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(`MiniMax returned an empty response for ${schemaName}.`);
  }

  const parsed = parseJsonResponse(content, schemaName);

  return transform ? transform(parsed) : (parsed as T);
}
