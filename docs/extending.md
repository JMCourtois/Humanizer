# Extending The App

This document is about safely changing Humanizer Lab without making the code confusing.

## General Rule

When you change behavior, try to follow the data flow in order:

1. types
2. prompts
3. agent wrapper
4. orchestrator
5. API response shape
6. UI

That order helps avoid partial changes.

## Common Change Recipes

## 1. Change The Model Or Provider Settings

Touch:

- `lib/minimax.ts`
- `.env.local`

Use this when you want to:

- change the default model
- change the base URL
- change request defaults like temperature handling

Be careful:

- keep model calls server-only
- do not leak secrets into client components

## 2. Change A Prompt

Touch:

- `lib/prompts.ts`

Maybe also:

- `lib/types.ts`
- `lib/agents/*`

Use this when you want to:

- change agent instructions
- tighten output requirements
- add or remove output fields

Be careful:

- if output shape changes, update both the type and the normalizer

## 3. Change The Pipeline Rules

Touch:

- `lib/orchestrator.ts`

Use this when you want to:

- change the approval threshold
- skip revision in some cases
- add a new pass
- build a different final verdict

Be careful:

- keep the flow readable
- try not to hide decisions inside too many helper layers

This file is educational on purpose.

## 4. Add A New Piece Of Job State

Touch:

- `lib/types.ts`
- `lib/store.ts`
- any UI files that read the new field

Use this when you want to:

- track extra metadata
- save another output
- add more timeline context

Be careful:

- make sure the default job shape still initializes correctly

## 5. Change What The User Sees

Touch:

- `components/HumanizerLab.tsx`
- `components/*`
- `app/globals.css`

Use this when you want to:

- add a panel
- change layout
- change wording
- show new data from the backend

## 6. Add Persistence Later

Start with:

- `lib/store.ts`

Likely then:

- `app/api/jobs/route.ts`
- `app/api/jobs/[id]/route.ts`
- `lib/orchestrator.ts`

The current store is in memory, so persistence is the biggest architectural upgrade you could make later.

## 7. Replace Polling With SSE Later

You would likely touch:

- `components/HumanizerLab.tsx`
- `app/api/jobs/[id]/route.ts` or a new stream route

That would reduce polling requests, but it would also make the app more complex.

## Safe Change Checklist

Before you finish a change, check:

- did I update `lib/types.ts` if the data shape changed?
- did I update the agent normalizer if model output changed?
- did I update the orchestrator if control flow changed?
- did I update the UI if the displayed fields changed?
- does `npm run build` still pass?

## Where To Start For Common Tasks

### "I want to change how the rewrite sounds"

Start in:

- `lib/prompts.ts`
- `lib/agents/humanizerAgent.ts`

### "I want the critic to be stricter"

Start in:

- `lib/prompts.ts`
- `lib/orchestrator.ts`

### "I want another revision pass"

Start in:

- `lib/orchestrator.ts`

Important:

- the current app is intentionally limited to one extra pass
- adding loops will make the pipeline harder to read

### "I want to store jobs in SQLite"

Start in:

- `lib/store.ts`

### "I want to show a diff"

Start in:

- `components/ResultPanel.tsx`

### "I want to add a new panel"

Start in:

- `components/HumanizerLab.tsx`
- `app/globals.css`

## Things Worth Preserving

As you extend the project, try to keep these qualities:

- server-only model calls
- readable orchestrator logic
- typed agent outputs
- clear event logs
- simple API endpoints
- UI that explains the workflow instead of hiding it
