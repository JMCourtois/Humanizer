# Agents

This document explains how the agents are defined and how to modify them safely.

## Important Idea

In this project, an "agent" is not a separate process.

An agent is simply:

- a role-specific prompt
- a JSON schema expectation
- a wrapper function that calls the model and normalizes the result

## Where Agent Logic Lives

There are three places to know:

### `lib/prompts.ts`

This file contains the prompt builders for all agents.

It defines:

- each agent's system prompt
- the user prompt shape
- the JSON structure the model should return

### `lib/agents/*`

Each agent has a small wrapper file:

- `lib/agents/briefAgent.ts`
- `lib/agents/humanizerAgent.ts`
- `lib/agents/meaningGuardAgent.ts`
- `lib/agents/naturalnessCriticAgent.ts`

Each wrapper:

- calls the correct prompt builder
- passes the prompt into `runMiniMax()`
- normalizes the returned JSON into the expected TypeScript shape

### `lib/types.ts`

This file contains the TypeScript interfaces for each agent output.

If you add, remove, or rename output fields, update this file too.

## The Four Agents

## 1. Brief Agent

Purpose:

- analyze why the text sounds robotic
- identify weak patterns
- define rewrite rules
- tell later steps what must be preserved

Output shape:

- `summary`
- `robotic_patterns[]`
- `target_tone`
- `preserve_rules[]`
- `rewrite_plan[]`

Main files:

- `lib/prompts.ts`
- `lib/agents/briefAgent.ts`

## 2. Humanizer Agent

Purpose:

- rewrite the text so it sounds more natural
- preserve meaning
- follow the brief

Output shape:

- `rewritten_text`
- `major_changes[]`
- `confidence`

Main files:

- `lib/prompts.ts`
- `lib/agents/humanizerAgent.ts`

Important detail:

- pass 1 uses the brief
- pass 2 uses the brief plus guard and critic feedback

## 3. Meaning Guard Agent

Purpose:

- compare the original and rewritten versions
- detect drift, lost nuance, or changed claims

Output shape:

- `approved`
- `drift_risk`
- `issues[]`
- `fix_instructions[]`

Main files:

- `lib/prompts.ts`
- `lib/agents/meaningGuardAgent.ts`

## 4. Naturalness Critic Agent

Purpose:

- judge whether the rewrite still feels AI-written
- provide a numeric score
- suggest specific tweaks

Output shape:

- `naturalness_score`
- `strengths[]`
- `remaining_ai_markers[]`
- `recommended_tweaks[]`

Main files:

- `lib/prompts.ts`
- `lib/agents/naturalnessCriticAgent.ts`

## How An Agent Call Works

The flow for every agent is roughly:

1. build a prompt in `lib/prompts.ts`
2. call `runMiniMax()` from the wrapper file
3. parse the JSON response
4. normalize it into a predictable shape
5. return it to the orchestrator

That normalization step matters because model output can be inconsistent.

Examples:

- arrays might be missing
- numbers might be out of range
- enum-like values might be invalid

The wrapper file protects the rest of the app from those issues.

## How To Edit An Existing Agent

If you want to change what an agent says or returns:

1. update the prompt in `lib/prompts.ts`
2. update the output type in `lib/types.ts` if needed
3. update the normalization logic in that agent's wrapper file
4. update any orchestrator logic that reads the changed fields
5. update any UI that displays the changed fields

### Example: add a new field to the critic

Say you want `Naturalness Critic` to also return `sentence_variety_score`.

You would touch:

1. `lib/types.ts`
2. `lib/prompts.ts`
3. `lib/agents/naturalnessCriticAgent.ts`
4. any UI file that should display the new field

## How To Add A New Agent

If you ever want a fifth agent, follow this order:

1. add a new output type to `lib/types.ts`
2. add the prompt builder to `lib/prompts.ts`
3. add a wrapper file in `lib/agents/`
4. add output storage fields to `JobOutputs`
5. add status metadata to `AgentName`, labels, and descriptions
6. update `lib/orchestrator.ts` to call the new agent
7. update the UI to display the new agent and its output

## Prompt Safety Rules In This Project

The prompts intentionally try to keep the system predictable:

- return JSON only
- do not add unsupported claims
- do not invent anecdotes
- preserve meaning first
- keep feedback specific and short

These rules are what make the multi-agent flow easier to trust.

## Common Mistakes To Avoid

### Changing the prompt but not the type

If the prompt returns a new field but `lib/types.ts` does not include it, the rest of the app will not know that field exists.

### Changing the type but not the normalizer

If the type changes but the wrapper still normalizes the old shape, you can end up with missing data.

### Changing an output field name without updating the UI

The right panel and result panel depend on the saved output shape.

If those field names change, UI displays may break or silently show less information.
