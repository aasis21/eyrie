# Taste examples

Two contrasting styles for product videos, distilled from studying many
launch and feature videos. Pick one per video (or the user's own taste notes
in Lore) and say which. Add new styles to the user's Lore after studying a
reference ([reference-videos](reference-videos.md)), naming the source video.

## A. Quiet demo (restrained, show-don't-tell)

Feature and developer videos that let the product speak.

- **Product early:** on screen in the first seconds; no long intro. In one
  59 s example, the product appeared at 0:14 and the call to action at 0:49
  (about 84% in), across 19 scenes of about 3 s each.
- **One idea per scene,** under a large headline (a brand font in a dark pill
  over footage works well).
- **Show over tell:** short narration or none; the screen carries the detail.
- **Motion:** checklists and logs fill in row by row; collages pan and settle;
  depth zooms from tilted windows to flat screens.
- **Background:** warm pale fields or a dark brand gradient. Footage floats in
  a window with a soft shadow, no browser chrome.
- **Cuts:** hard cuts by default; a single dissolve into the end card.
- **Music:** ambient or light electronic; minimal or none for developer and
  terminal videos. Music never dominates; fade in and out.
- **Length:** 60-80 s for a feature; the call to action at about 80-85% in.

In Clueso: dark brand background, footage at about 0.78 size (crop-safe),
headline pill `#0B1430` at 88% with white 34 px bold text; a brisk voice with
short lines; an ambient track at about 9%; slides built from native elements
whose rows fade in with the narration.

## B. Bright launch reel (music-driven, no voiceover)

Launch announcements for a broad audience.

- **No voiceover.** Music plus on-screen text only; the video still explains
  itself with one short phrase per beat.
- **Text:** one short centred line, regular or light weight, dark grey on
  white or pale blue, never more than 5 words. Inline icons and avatars
  replace words ("Work with [faces]").
- **Opening:** the product logo alone for about 2 s, then 2 s text cards, then
  the first UI at about 10 s.
- **Background:** airy white to sky-blue gradients; UI scenes on near-white.
  No dark backgrounds.
- **UI shots:** real UI, cropped close and scaled up, no browser chrome. The
  camera pushes in and pans instead of cutting.
- **People:** named coloured cursor pills and round avatars show
  collaboration; AI assistants get their own avatar style.
- **Music:** upbeat electronic (about 120-145 BPM, bright). Starts moderate,
  lifts about 4 dB when the UI montage starts, then a clean fade. Visual
  changes land on musical accents roughly every 2.5 s.
- **Close** on the product logo alone.

In Clueso: a light gradient image (or a near-white `background_color`);
footage at about 0.78-0.86 size, borderless with a soft shadow; zooms of
1.3-1.6x with long entries to imitate push-ins; text at weight 400-500,
56-72 px, near-black; music from `find(type='music', query='bright upbeat
electronic', energy 4, bpm_min 120)` at volume 35-45 with no voiceover, 12-16
under one. If the user wants narration anyway (docs videos usually need it),
keep it to a few short lines and let text cards carry the structure.

## Choosing

| If the video… | Lean |
|---|---|
| Proves a technical feature to practitioners | A |
| Announces something to a broad audience | B |
| Will be embedded in docs next to other videos | Whichever those videos use |
