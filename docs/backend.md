# Backend

This document explains the server-side pieces of Humanizer Lab.

## Backend Overview

The backend is made of four main parts:

- route handlers
- the in-memory store
- the orchestrator
- the MiniMax provider wrapper

## Route Handlers

### `POST /api/jobs`

File: `app/api/jobs/route.ts`

This route:

1. reads `inputText` from the request body
2. validates that it is a non-empty string
3. creates a new job in the store
4. starts the orchestrator asynchronously
5. returns `{ jobId }`

Important detail:

- the route returns quickly
- the pipeline continues in the background

That is why the frontend can create a job immediately and then start polling.

### `GET /api/jobs/[id]`

File: `app/api/jobs/[id]/route.ts`

This route:

1. reads the job id from the URL
2. looks up the job in the store
3. returns the full job snapshot

This is what powers the live dashboard.

## Store

File: `lib/store.ts`

The store is a simple `Map<string, JobState>`.

Core helpers:

- `createJob(inputText)` creates a queued job
- `getJob(jobId)` returns the live mutable job object
- `getJobSnapshot(jobId)` returns a cloned snapshot for safe API responses
- `addEvent(jobId, event)` appends a timeline event
- `setJobStatus(jobId, status, currentStep)` updates global job status
- `setAgentStatus(jobId, agentName, status)` updates one agent node
- `saveAgentOutput(jobId, key, value)` saves structured output
- `setJobError(jobId, step, message)` saves failure info

### Why `getJobSnapshot()` exists

The API should not expose the live mutable object from the map.

Returning a cloned snapshot is safer because:

- callers cannot accidentally mutate the original data
- responses are easier to reason about
- the polling endpoint returns a stable shape

## Orchestrator

File: `lib/orchestrator.ts`

This is the brain of the app.

It runs the pipeline in readable sequential code:

1. start the job
2. run `Brief Agent`
3. run `Humanizer Agent` pass 1
4. run `Meaning Guard Agent` pass 1
5. run `Naturalness Critic Agent` pass 1
6. decide whether to revise
7. if needed, run pass 2
8. build the final report
9. mark the job completed

### Why this file matters

If you want to change pipeline behavior, this is usually the first file to inspect.

Examples:

- change the revision threshold
- add another step
- skip a step
- change the final verdict rules

### Decision Rule

The current rule is:

- if `Meaning Guard` does not approve, revise
- if `Naturalness Critic` score is below `8`, revise
- otherwise finish after pass 1

Only one extra rewrite pass is allowed in v1.

### Error Handling

If an error happens:

- the current step is recorded
- the active agent is marked `blocked`
- idle agents are marked `blocked`
- the job status becomes `failed`
- an error event is appended to the timeline

This makes failures visible in the UI instead of silently disappearing.

## MiniMax Provider

File: `lib/minimax.ts`

This file wraps the OpenAI SDK so the rest of the app can treat MiniMax calls as a simple helper.

`runMiniMax()` does four important things:

1. creates the OpenAI client using MiniMax's base URL
2. sends a chat completion request
3. strips markdown code fences if the model adds them
4. parses the JSON response and throws a readable error if parsing fails

### Why This Wrapper Is Useful

Without a wrapper, every agent file would repeat:

- environment variable handling
- SDK setup
- JSON parsing
- error formatting

Centralizing that logic keeps the agent files small.

## Shared Types

File: `lib/types.ts`

The backend and frontend both rely on these shared types.

If you change the shape of:

- agent outputs
- final results
- events
- statuses

you should usually start in `lib/types.ts`.

## Common Backend Changes

### Change the score threshold

Touch:

- `lib/orchestrator.ts`

Look for the `shouldRevise` decision.

### Change the final verdict text

Touch:

- `lib/orchestrator.ts`

Look for `buildVerdict()`.

### Add a new event message

Touch:

- `lib/orchestrator.ts`

Use `addEvent(jobId, { ... })`.

### Persist jobs in a real database later

Start with:

- `lib/store.ts`
- `app/api/jobs/route.ts`
- `app/api/jobs/[id]/route.ts`

## Debugging Tips

If a job fails:

1. check the error shown in the UI
2. inspect the last event in the timeline
3. inspect `lib/minimax.ts` for JSON parse errors
4. verify `.env.local` contains a real API key
5. make sure your prompt changes still match the expected output shape
