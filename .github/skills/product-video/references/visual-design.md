# Visual design

Start from the user's brand kit in Lore ([brand-assets](brand-assets.md));
the values below are a neutral default.

## Look

- **Background**: a branded gradient generated locally
  ([`scripts/gradient_bg.py`](../scripts/gradient_bg.py)); the default is deep
  navy with blue (top-left) and teal (bottom-right) glows. Pass the brand
  colours with `--base`, `--glow1`, `--glow2`. Apply to every clip with
  `update_clips background:{src: mup_…, padding:0}`.
- **Type**: Inter (or the brand font, if Clueso has it); headlines 700,
  labels 600, body 400. Default palette: white `#EEF3FB`, muted `#9DB0D3`,
  one accent (teal `#3FD0D4`) and one secondary (blue `#4C8DFF`). Sentence
  case.
- **Safe margins**: 120 px left/right, 100 px top/bottom — and the
  watermark-safe area if exporting on a watermarked plan (see
  [watermark-and-export](watermark-and-export.md)).

## Scene types

| Scene | Composition |
|---|---|
| Title | Product pill, large headline (fit on one line), subline, official logo pop-in right |
| Problem | Two cards (yours vs another team), connector + "?", pain tags appear on their words |
| Cast | Headline, 3 cards with logos and role/team subtitles, connection chips on links, trust line |
| Recording | Framed window (~75–80% canvas), scene label pill top-left, "Simulated" tag top-right |
| End | Logo, value line, accent line, call to action + docs URL |

## Motion

- Entrances 0.3–0.5 s; visuals land 0.15–0.25 s before their word.
- One entrance vocabulary (fade/slide); logos pop with a small overshoot.
- No slow scale drift; nothing moving while text is being read.
- Zoom into the one UI moment that proves the line (the "Added" card, the
  result row), then zoom out.
- An end card can call back to the Problem scene: the "?" becomes a link and
  the pain tags strike through.

## Logos

- Use official assets the user has rights to. Check the product's own
  repository first (for example `assets/*.svg`, `assets/icon.png`), then the
  vendor's official icon pack for any third-party logo.
- Keep logos unrecolored and on backgrounds that suit them; size 60 px in
  cards, 120 px on the end card, ~280 px on the title. Keep them clear of the
  longest headline.

## Music

- Clueso library, instrumental, energy 3, focused/confident; volume ~10-12
  under narration, fade-in 1.5 s, fade-out 3 s; trim or extend to the final
  length ([sync-and-audit](sync-and-audit.md#extend-music-to-the-videos-length)).

## Layout lessons

- **Pills in rows**: never estimate widths. Set the font, read each label's
  `layout.natural_width_px` from the `update_elements` reply
  (`returning:['layout']`), then place left-to-right with fixed padding (12)
  and gap (14). Use font 22 when six or more pills share a card.
- **No empty slide beats**: every second of a slide scene needs a visual.
  When narration starts with a line the diagram doesn't illustrate yet, show
  the headline at 0 s and add an interim visual for that line (e.g. one
  card with two capability chips), fading out as the main diagram arrives on
  its cue word.
- **Logos over decoration**: replace placeholder dots with the official logo;
  move it clear of the headline (check the longest headline width).

## Matching a docs site's videos

When a video will sit next to existing videos on a docs site, study one of
them first ([reference-videos](reference-videos.md)) and borrow its length,
highlighter or takeaways style; keep real UI footage, because it proves the
feature.

- Scene labels: plain team or role names ("Web app team · Incident") rather
  than internal IDs.
- Simulated scenarios carry a small amber "Simulated scenario" tag on every
  scenario scene.
- Idea slide: three cards, connector lines that appear as the narration
  names each team, a "question"/"findings" label pair.
