# Humanizer Lab

Humanizer Lab is a small educational Next.js app that shows how to build a MiniMax-powered multi-agent workflow without a big agent framework.

The app lets a user:

- paste text into a textarea
- run a visible four-agent pipeline
- watch job events update in real time through polling
- inspect each agent's structured JSON output
- compare the original text to the final humanized version

The project is intentionally small. It is built to teach architecture, not to behave like a production SaaS app.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create or update `.env.local` in the project root:

```bash
OPENAI_API_KEY=your_minimax_api_key_here
OPENAI_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-M2.7
```

Notes:

- `OPENAI_API_KEY` should be your MiniMax API key
- `OPENAI_BASE_URL` points the OpenAI SDK at MiniMax's OpenAI-compatible endpoint
- `MINIMAX_MODEL` is optional, but the app defaults to `MiniMax-M2.7`

### 3. Run the development server

```bash
npm run dev
```

### 4. Open the app

Open [http://localhost:3000](http://localhost:3000)

### 5. Try the pipeline

1. Paste AI-written text into the textarea, or load the sample text.
2. Click `Run Humanizer Pipeline`.
3. Watch the left panel for agent status changes.
4. Watch the right panel for event logs and structured outputs.
5. Review the final humanized result in the center panel.

## What This Project Teaches

Humanizer Lab is built around a simple mental model:

- `MiniMax` is the model provider
- an `agent` is a prompt + output schema + small wrapper
- the `orchestrator` is normal TypeScript code
- the `job store` is an in-memory `Map`
- the `UI` is a window into the workflow, not the workflow engine

This is the core lesson: multi-agent behavior can be built with normal web app patterns.

## How It Works

The pipeline is intentionally deterministic:

1. `Brief Agent` analyzes why the text sounds robotic and defines rewrite rules.
2. `Humanizer Agent` rewrites the text using that brief.
3. `Meaning Guard Agent` checks the rewrite for semantic drift.
4. `Naturalness Critic Agent` scores how human the result sounds.
5. If meaning is not approved or the naturalness score is below `8`, the app runs one more humanizer pass with the feedback from Guard and Critic.

Only one revision loop is allowed in v1. That keeps the system easy to read and easy to debug.

## Project Structure

```text
app/
  api/jobs/route.ts         Create jobs
  api/jobs/[id]/route.ts    Poll a job
  layout.tsx                Root layout
  page.tsx                  Landing page
  globals.css               App styles

components/
  HumanizerLab.tsx          Main client dashboard
  InputPanel.tsx            Textarea + run controls
  AgentGraph.tsx            Pipeline relationship view
  Timeline.tsx              Event log
  AgentCard.tsx             Expandable JSON card
  ResultPanel.tsx           Final output + summary

lib/
  agents/                   One wrapper per agent
  minimax.ts                OpenAI SDK wrapper for MiniMax
  orchestrator.ts           Sequential server pipeline
  prompts.ts                Prompt builders and JSON shapes
  store.ts                  In-memory job store
  types.ts                  Shared TypeScript types
```

## Documentation Map

The root README is the fast overview. The `docs/` folder goes deeper.

- [docs/README.md](docs/README.md): docs index and recommended reading order
- [docs/architecture.md](docs/architecture.md): big-picture architecture and request flow
- [docs/backend.md](docs/backend.md): route handlers, store, orchestration, and job lifecycle
- [docs/agents.md](docs/agents.md): agent roles, prompts, schemas, and how to modify them
- [docs/frontend.md](docs/frontend.md): UI structure, client state, and polling flow
- [docs/extending.md](docs/extending.md): common code changes and safe extension patterns

## Why Model Calls Stay On The Server

All MiniMax calls happen on the server because:

- API keys should not reach the browser
- orchestration is easier to reason about on the backend
- the client only needs job state, not model access
- the code stays closer to how a real production system would be structured

## Current Limitations

These tradeoffs are intentional for v1:

- jobs live in memory only
- restarting the server clears all jobs
- there is no database or queue
- there is no authentication
- there are no websocket updates
- there is no prompt editing UI
- there are no external tools or web search calls

This makes the code easier to learn from.

## Build Check

The project should build with:

```bash
npm run build
```

## Next Places To Learn

If you are new to the codebase, read the docs in this order:

1. [docs/architecture.md](docs/architecture.md)
2. [docs/backend.md](docs/backend.md)
3. [docs/agents.md](docs/agents.md)
4. [docs/frontend.md](docs/frontend.md)
5. [docs/extending.md](docs/extending.md)
