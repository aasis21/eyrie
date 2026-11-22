# Product framing

A fill-in template for the product the video is about. Ground every claim in
current documentation and shipped code; re-read the docs before scripting,
because capabilities change. Save the filled-in version in Lore (for example
`lore/<area>/product-framing.md`) so the next video starts from it.

## Product facts (fill in)

| Item | Value | Source |
|---|---|---|
| Product name (first mention / after) | `<Full Name>` / `<Short Name>` | |
| One-line positioning | `<what it is, for whom>` | |
| Audience | `<customers / developers / internal>` | |
| Docs URL for the call to action | `<feature docs URL, not the product root>` | |
| Release stage | `<GA / preview / not launched>` | |

## Documented capabilities (fill in from the docs)

| Area | Supported | Source |
|---|---|---|
| `<integrations>` | | |
| `<extension points>` | | |
| `<governance / security>` | | |
| `<workflows>` | | |

Only show what is built and deployed. If a scene depends on a change that
hasn't shipped, hold publishing until it does, and don't mention it.

## Framing patterns

- **Problem**: what the audience lives with, in their words (for example "the
  issue changes queues, another on-call gets paged, context starts over").
- **Capability tags** (problem scene): 4-6 short nouns for what the product
  already covers; breadth belongs here, not in the pivot line.
- **Positioning a new feature**: tie it to what already exists. Separate
  "extends one thing" from "connects things", for example "Plugins extend
  what it can do on its own. `<Feature>` lets it work with others."
- **Governance line** where enterprise viewers ask: identity, permissions,
  approvals, "only calls what you've added".
- **Close**: a value line that calls back to the problem, plus a call to
  action that is true (don't say "turn it on" when it's on by default).

## Wording

- Full product name on first mention, short name after.
- Prefer feature language over UI labels ("one setting turns it on" rather
  than the settings page's title).
- Preview features: say "preview" if launched; otherwise avoid stage words.
- Use the product's own terms; avoid protocol jargon and two terms that sound
  alike in the same line.
