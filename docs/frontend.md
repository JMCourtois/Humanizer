# Frontend

This document explains the client-side dashboard.

## Frontend Overview

The UI has one main client component:

- `components/HumanizerLab.tsx`

That component coordinates the dashboard and renders smaller presentation components.

## Screen Layout

The page is split into three panels:

### Left Panel

Rendered by `AgentGraph.tsx`

Shows:

- the four visible agents
- their current statuses
- the handoff relationships
- whether the revision loop happened

### Center Panel

Rendered by:

- `InputPanel.tsx`
- `ResultPanel.tsx`

Shows:

- the textarea
- the run button
- the current or final rewrite
- the summary cards
- the original vs final text comparison

### Right Panel

Rendered by:

- `Timeline.tsx`
- `AgentCard.tsx`

Shows:

- the event timeline
- one expandable JSON card per finished output

## Main Client State

Most UI state lives in `components/HumanizerLab.tsx`.

Important state values:

- `inputText`: current textarea value
- `job`: latest job snapshot from the server
- `jobId`: active job id
- `isSubmitting`: whether the app is creating a job
- `errorMessage`: client-side request or polling errors

## Polling Flow

The frontend uses a simple polling loop.

High-level behavior:

1. user clicks `Run Humanizer Pipeline`
2. the client calls `POST /api/jobs`
3. the client stores the returned `jobId`
4. the client starts polling `GET /api/jobs/:id`
5. the UI re-renders whenever a new job snapshot arrives
6. polling stops when the job is no longer `queued` or `running`

The poll interval currently lives in:

- `components/HumanizerLab.tsx`

Look for:

- `const POLL_INTERVAL_MS = 900`

## Why The Dashboard Feels Live

The UI feels live because the backend updates shared job state after every meaningful step:

- start agent
- finish agent
- save output
- make decision
- finish job
- fail job

The client then fetches those snapshots on an interval.

## Component Responsibilities

### `HumanizerLab.tsx`

This is the controller component.

It:

- owns the main state
- starts jobs
- polls the server
- computes display values like `revisionTriggered`
- passes data into child components

### `InputPanel.tsx`

This is the input form.

It handles:

- textarea display
- sample text loading
- run button display
- simple client-side empty-state rules

### `AgentGraph.tsx`

This is the visual relationship panel.

It reads agent statuses and current step and turns them into:

- node states
- relationship labels
- feedback loop highlighting

### `Timeline.tsx`

This renders ordered job events.

It expects the backend to provide already-ordered event data.

### `AgentCard.tsx`

This renders a collapsible JSON block for structured outputs.

### `ResultPanel.tsx`

This combines:

- top-level status summary
- original vs final text
- final verdict
- "what changed" notes

## Styling

Global styles live in:

- `app/globals.css`

This file controls:

- the three-column layout
- panel styling
- graph node layout
- cards, buttons, text blocks, and spacing

If you want to change the visual design, start there.

## Common Frontend Changes

### Change the polling interval

Touch:

- `components/HumanizerLab.tsx`

### Add a new output card

Touch:

- `lib/types.ts`
- `components/HumanizerLab.tsx`
- possibly `components/ResultPanel.tsx`

### Change what the result summary shows

Touch:

- `components/ResultPanel.tsx`

### Change the graph labels or statuses

Touch:

- `lib/types.ts`
- `components/AgentGraph.tsx`

### Restyle the whole app

Touch:

- `app/globals.css`

## Good Frontend Debugging Questions

If the UI is wrong, ask:

1. is the backend returning the field I expect?
2. does `lib/types.ts` include that field?
3. does `HumanizerLab.tsx` pass the data to the right child component?
4. is the child component actually rendering it?
5. is CSS hiding or collapsing something unexpectedly?
