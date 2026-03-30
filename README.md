# Humanizer Lab

Humanizer Lab is a small educational Next.js app that demonstrates how to build a readable multi-agent workflow without a heavy agent framework.

The app lets you:

- paste text into a textarea
- run a four-agent pipeline on the server
- watch agent statuses update over time
- inspect structured JSON outputs from each agent
- compare the original text against the final humanized rewrite

## What This Project Teaches

This project is designed to show a simple mental model:

- MiniMax is the model provider
- each agent is just a prompt plus a JSON output contract
- the orchestrator is plain TypeScript
- the job store is a lightweight in-memory `Map`
- the UI is a polling dashboard over route handlers

You do not need a special agent runtime to experiment with multi-agent patterns. A normal web app with backend orchestration is enough for a learning project.

## Architecture

Humanizer Lab uses:

- Next.js App Router
- TypeScript
- Next.js Route Handlers for backend endpoints
- the OpenAI SDK pointed at MiniMax's OpenAI-compatible base URL
- an in-memory job store in `lib/store.ts`
- client-side polling for status updates

### Pipeline

1. `Brief Agent` analyzes why the text sounds robotic and defines rewrite rules.
2. `Humanizer Agent` rewrites the text from the original plus the brief.
3. `Meaning Guard Agent` checks the rewrite for semantic drift.
4. `Naturalness Critic Agent` scores how human the result sounds.
5. If the guard rejects the rewrite or the critic scores it below `8`, the orchestrator runs one more Humanizer pass using both sets of feedback.

That single revision loop is intentionally capped at one retry in v1 to keep the control flow deterministic and easy to learn from.

## File Layout

The app is organized around a few clear layers:

- `app/page.tsx`: page shell and educational framing
- `app/api/jobs/route.ts`: create jobs
- `app/api/jobs/[id]/route.ts`: poll job state
- `components/*`: dashboard UI
- `lib/minimax.ts`: MiniMax provider wrapper using the OpenAI SDK
- `lib/agents/*`: one file per visible agent
- `lib/orchestrator.ts`: readable sequential orchestration logic
- `lib/store.ts`: in-memory job state
- `lib/types.ts`: shared types for job state and agent outputs

## Running Locally

1. Install dependencies:

```bash
npm install
```

2. Update `.env.local` with your MiniMax key:

```bash
OPENAI_API_KEY=your_minimax_api_key_here
OPENAI_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-M2.7
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## MiniMax Integration

MiniMax is used through its OpenAI-compatible API surface:

- base URL: `https://api.minimax.io/v1`
- SDK: `openai`
- default model: `MiniMax-M2.7`

The wrapper lives in `lib/minimax.ts`. All model calls happen on the server, which keeps the API key out of the browser and keeps the architecture aligned with how production apps should treat secrets.

## Why The Model Calls Stay On The Server

This app deliberately keeps all LLM calls inside Next.js server code:

- API keys are not exposed to the client
- orchestration stays deterministic and centralized
- polling only needs job state, not direct model access
- the UI remains a view into the workflow instead of becoming the workflow engine

## v1 Limitations

These tradeoffs are intentional:

- jobs live in memory only
- restarting the server clears all jobs
- there is no database or queue
- there is no authentication
- there are no websocket updates
- there is no prompt editing UI
- there are no external tools or web search calls

This makes the code easier to read and extend while you learn the pattern.

## Ideas For v2

After v1 works, natural extensions would be:

- switch polling to SSE
- persist jobs in SQLite
- add tone presets
- add a stricter meaning-preservation mode
- add a side-by-side diff viewer
- expose prompts in a dev panel
- retrieve local style guides as a constrained tool step
