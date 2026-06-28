# Bugfix Prompt

Target project alias: `<alias>`

Resolve `<alias>` through `~\cortex\projects\registry.json`, then `cd` to its path.

Bug: `<symptom or failing command>`

Include:
- Reproduction steps: `<steps>`
- Expected result: `<expected>`
- Actual result: `<actual>`
- Suspected area: `<files/modules if known>`

Find the smallest root-cause fix; avoid unrelated cleanup.
Add or update a focused regression test when practical.
Run the relevant test command from the registry and report the result.
