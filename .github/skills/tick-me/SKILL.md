---
name: tick-me
description: "Use when the user asks for recurring ticks or reminders to keep working on the current task. Each tick checks progress, avoids duplicate work, takes the next useful action, and stops when done, cancelled, blocked, or unsafe to continue."
argument-hint: "<user-specified interval or calendar timing>"
---

# Tick Me

A reminder for the current session. It is not a worker, plan, or source of
authority. The conversation, todos, repository, and active work define the task.

## Start

1. Require the user to give an interval or calendar time. There is no default.
2. List schedules. Keep exactly one `[tick-me]` schedule for this session, and
   replace it only when the user changes the timing.
3. Create one schedule with this prompt:

   > [tick-me] Continue the current task. First check the conversation, todos,
   > repository, and active agents, commands, builds, and schedules. Do not
   > duplicate work. Take the next useful action. Stop and remove this schedule
   > when the task is done, cancelled, paused, blocked with no safe action left,
   > or no longer clear enough from context to continue safely.

4. Verify that exactly one schedule exists, then continue the task now.

## Each Tick

1. Check current state before acting. Use completion notifications instead of
   polling or starting duplicate work.
2. Take the next useful action within the task's workflow, permissions, and
   safety rules.
3. Keep ticking through normal failures, partial progress, compaction, and
   long-running work when a safe next step exists.
4. Stop and verify removal only when the task is complete, cancelled, paused,
   truly blocked with no safe work left, or unclear from session context.

## Rules

- Create a tick only when asked. Never create one per subtask.
- The timing controls reminders, not what action each tick takes.
- Never expand scope, bypass approval, weaken validation, or publish/deploy
  merely because a tick fired.
- Do not create state files, agents, daemons, or polling loops for Tick Me.
- Do not promise ticks after the Copilot session closes.
