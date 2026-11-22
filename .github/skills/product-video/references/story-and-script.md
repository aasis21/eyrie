# Story and script

## Argument, not tour

Every scene answers "what just happened, and why should I care?" Structure:

1. **Problem** — the pain in the viewer's words. Name what they live with
   (incident moves queues, someone gets paged, context starts over), not an
   abstract inefficiency.
2. **Context** — frame the demo before showing results: "Let's try it on
   eShop, a sample store, with a simulated incident." Never open a demo scene
   with a result the viewer has no context for ("Here, orders are stuck.").
3. **Concept / cast** — one diagram of the parts and how they connect.
4. **Mechanism** — only the configuration that proves control or safety
   (identity, approvals, "only calls what you added").
5. **Proof** — the product doing the work and a specific, verifiable result.
6. **Extension** — one beat that broadens the claim (an external platform).
7. **Close** — a value line and an end card with a call to action.

## Script rules

- Short declarative sentences; one idea each. Target 2.2–2.6 words/second.
- Avoid: simply, seamlessly, powerful, effortlessly, revolutionary.
- Don't repeat an idea across scenes (e.g. "every handoff can be traced" and
  "a record of who called whom" — keep one).
- Prefer product language over UI labels: say "one setting turns it on", not
  "experimental settings" (the label still shows on screen).
- Say what was found, not "the evidence and the next checks".
- Keep claims honest: label simulated scenarios, never imply a live incident
  or confirmed root cause unless it is.
- When the presenter asks for a rewrite, produce wording in your own voice;
  do not echo their phrasing back.
- On-screen text: 3–6 words, replaced not stacked; never repeat the
  narration verbatim.

## Reviewing a script

Read the full narration in order and check:

- Does each scene's narration match its footage? (A line saying "this is the
  agent" over a GitHub page is a mismatch.)
- Is anything vague, awkward ("Why is a question for the team"), or jargon?
- Is there a guardrail/safety line where enterprise viewers will ask?
- Does the first payoff land by about 60 seconds?
- Are there two lines doing the same job?

Present findings as a table: scene, current line, proposed line, seconds
saved/added, trade-off. Get sign-off before regenerating.

## Shortening

Order of cuts: pauses → setup narration → configuration footage (speed up,
don't drop the safety beat) → cast narration (cards carry names) → closing
pause. Never cut the proof beat or the real result.

## Living script file

Keep one file (for example `<notes>/videos/<video>/script.md`)
with: title/length/format, cast table, per-scene narration with timings,
prompts, expected answers, on-screen rules, readiness table. Update after
every narration change so the file matches the project.

## Audit narration against footage (every sentence)

Before every export, list each narration sentence with its absolute start
time (sum clip durations + `voiceover_words` start), extract one frame at each
start from the latest export (or render it in Clueso), and check:

- The sentence describes what is visible at that moment (not 5 s later).
- Field and button names match the UI exactly (e.g. the form says
  "Description", not "purpose").
- No sentence is split across a clip break or a long pause.
- The point the presenter wants is said explicitly (e.g. "it keeps
  investigating instead of waiting on a handoff", not a technical detail).

Fix mismatches by recutting footage from the source recording (keep it in a
stable local folder), not by stretching narration.

## Public and docs videos (learned 2026-11-17)

- **Introduce the cast before any UI.** Viewers found it abrupt when the
  scenario started inside the product. Add an Idea + example slide: one line on
  what the feature does, then the cast ("Let's follow three teams at Acme:
  ...") with a card per team and a "simulated example" tag.
- **Narrate the gist, not the screen.** Don't read IDs, times, counts or change
  numbers aloud ("CHG-4821 at 08:05 cut keepalive from 320 to 32"). Say what it
  means ("a recent network change is the likely cause, with a clear next
  step") and let the screen carry the detail.
- **Borrow the docs' wording.** When the video is embedded on a docs page, lift
  phrases from that page so the two match (feature name and positioning,
  "collaborate across team boundaries", "no credentials or tool access are
  shared").
- **Show current and proposed narration as text** in one table before
  rebuilding; the user edits wording there.
- **End card:** the core line, three numbered takeaways, and the feature's
  docs URL (not the product root). Keep CTAs true: don't say "turn it on in
  Settings" when it's on by default.
- **Length:** match existing videos on the same docs site (short explainers
  often run about 1:45-2:00); 2:00-2:50 is acceptable when every scene earns
  its time.
