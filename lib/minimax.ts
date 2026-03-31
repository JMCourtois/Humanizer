import "server-only";

import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M2.7";
const MAX_JSON_ATTEMPTS = 2;

class InvalidJsonResponseError extends Error {
  rawResponse: string;

  constructor(schemaName: string, reason: string, rawResponse: string) {
    super(
      `MiniMax returned invalid JSON for ${schemaName}: ${reason}. Raw response: ${rawResponse
        .slice(0, 400)
        .trim()}`,
    );
    this.name = "InvalidJsonResponseError";
    this.rawResponse = rawResponse;
  }
}

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

function stripThinkingTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractFirstJsonObject(content: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (start === -1) {
      if (character === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return content.slice(start, index + 1);
      }
    }
  }

  return null;
}

function buildJsonCandidates(content: string): string[] {
  const cleaned = stripMarkdownFences(content);
  const withoutThinking = stripThinkingTags(cleaned);
  const candidates = [
    cleaned,
    withoutThinking,
    extractFirstJsonObject(withoutThinking),
  ];

  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate?.trim())))];
}

function parseJsonResponse(content: string, schemaName: string): unknown {
  const candidates = buildJsonCandidates(content);
  let lastReason = "Unknown parse error";

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastReason = error instanceof Error ? error.message : "Unknown parse error";
    }
  }

  throw new InvalidJsonResponseError(schemaName, lastReason, stripMarkdownFences(content));
}

function buildRetryUserPrompt(userPrompt: string): string {
  return `${userPrompt}

IMPORTANT:
- Return exactly one JSON object.
- Start with { and end with }.
- Do not include <think> tags, markdown fences, or any text before or after the JSON.`;
}

async function requestMiniMaxCompletion(client: OpenAI, input: {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}) {
  const request = {
    model: process.env.MINIMAX_MODEL || DEFAULT_MODEL,
    temperature: input.temperature,
    response_format: { type: "json_object" as const },
    extra_body: { reasoning_split: true },
    messages: [
      {
        role: "system" as const,
        content: input.systemPrompt,
      },
      {
        role: "user" as const,
        content: input.userPrompt,
      },
    ],
  };

  return client.chat.completions.create(request);
}

export async function runMiniMax<T>({
  systemPrompt,
  userPrompt,
  schemaName,
  temperature = 0.2,
  transform,
}: MiniMaxPromptConfig<T>): Promise<T> {
  const client = getClient();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt += 1) {
    const completion = await requestMiniMaxCompletion(client, {
      systemPrompt,
      userPrompt: attempt === 1 ? userPrompt : buildRetryUserPrompt(userPrompt),
      temperature,
    });
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error(`MiniMax returned an empty response for ${schemaName}.`);
    }

    try {
      const parsed = parseJsonResponse(content, schemaName);
      return transform ? transform(parsed) : (parsed as T);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown parse error");

      if (!(error instanceof InvalidJsonResponseError) || attempt === MAX_JSON_ATTEMPTS) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`MiniMax failed to return JSON for ${schemaName}.`);
}
