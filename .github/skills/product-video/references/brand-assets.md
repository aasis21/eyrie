# Brand assets

Keep the user's brand kit in Lore so every video starts from it: a short
section in `lore/me.md`, or a topic such as `lore/<area>/brand-kit.md`. Store
paths and values, not the image files. Logos stay where the user keeps them
(the product's repository, a design folder); only use logos the user has
rights to.

## Brand kit template

```markdown
---
description: Brand kit for product videos (logos, colours, type, music, voice)
---

# Brand kit: <product>

## Logos
| Asset | Path or URL | Use |
|---|---|---|
| Mark (colour) | <repo>/assets/icon.svg | Title (~280 px), cards (60 px), end card (120 px) |
| Mark (mono) | <repo>/assets/icon-mono.svg | Light backgrounds |
| Partner logo | <official icon pack> | Partner card |

## Colours and type
- Background: <base r,g,b>, glows <r,g,b@x,y> (for gradient_bg.py)
- Text <hex>, muted <hex>, accent <hex>, secondary <hex>
- Font: <font available in Clueso>; sentence case

## Voice and music
- Narrator: <voice name(s)>; pace notes
- Music: <tracks liked / rejected>, volume under narration

## Labels
- Scene label pills: "<Team> · <Page>"; tag "Simulated scenario"
- Call to action: <wording + docs URL>
```

## Using it

- Upload logos with `upload_file` and place them as `element_type:'image'`.
  SVG and PNG both work. Don't recolor.
- Generate the background with `scripts/gradient_bg.py` using the kit's
  colours.
- Clueso workspaces have their own brand kit (`manage_brand_kit`); discover
  its schema before use and keep it consistent with the Lore copy.
- Check the vendor's official icon pack before drawing any third-party logo.

## UI hygiene

- Crop out preview or trial banners when possible; blur personal names in
  headers if the audience is external.
- Banners that only appear on test environments are fine for internal videos;
  crop them for external ones.
