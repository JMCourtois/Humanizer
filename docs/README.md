# Docs

This folder explains how Humanizer Lab is put together and where to make changes.

If you are a junior developer, read the docs in this order:

1. [Architecture](./architecture.md)
2. [Backend](./backend.md)
3. [Agents](./agents.md)
4. [Frontend](./frontend.md)
5. [Extending The App](./extending.md)

## What Each Document Covers

### [architecture.md](./architecture.md)

Start here if you want the big picture.

It explains:

- the main moving parts
- the request flow from browser to model and back
- why the app uses polling and an in-memory store
- how the pipeline fits together conceptually

### [backend.md](./backend.md)

Read this when you want to understand server-side behavior.

It explains:

- the API routes
- how jobs are created and stored
- how the orchestrator runs the pipeline
- how errors are recorded
- where to change backend behavior safely

### [agents.md](./agents.md)

Read this when you want to change prompts or add agent logic.

It explains:

- what each agent does
- where prompt text lives
- where JSON output is normalized
- how agent types connect to the orchestrator and UI

### [frontend.md](./frontend.md)

Read this when you want to change the UI.

It explains:

- which component owns which part of the screen
- how polling works
- how results appear while the job is running
- where to change layout, styling, and presentation

### [extending.md](./extending.md)

Read this when you want to modify behavior.

It explains:

- common change recipes
- where to touch the code for each kind of change
- what to be careful about when extending the app

## Fast File Guide

If you just need a quick pointer:

- change prompts: `lib/prompts.ts`
- change agent wrappers: `lib/agents/*`
- change pipeline order or rules: `lib/orchestrator.ts`
- change API behavior: `app/api/jobs/*`
- change job state shape: `lib/types.ts`
- change in-memory storage behavior: `lib/store.ts`
- change the main UI flow: `components/HumanizerLab.tsx`
- change styles: `app/globals.css`
