# Sanitize for a public audience

Make every captured frame safe to publish: no real people, accounts, internal
resource names, hosts, IDs or internal chat titles.

## Approach

1. **Inventory first.** On each page you'll capture, collect visible text,
   chat and conversation titles, dropdown options and input values (dump
   `innerText` from the app frame). List everything that identifies a person,
   account, project, internal service, host or ID.
2. **Pick a cast.** Public names that tell the story (for example `web-app`,
   `payments-api`, `data-pipeline`, user "Alex Morgan" at "Acme"). Map every
   real name to one cast name.
3. **Write the config** (copy `scripts/sanitize.config.example.json` to
   `<out>`, the task's output folder):

| Field | Use |
|---|---|
| `reps` | `[regex, flags, replacement]`, applied in order. Specific before general: full name before first name, `my-staging-app-1` before `my`. Use a lookbehind to avoid double mapping (`(?<!support-)comms-bot`). |
| `oldTitles` + `pool` | Exact old chat titles (lower-case) map to a stable title from the pool. Collect titles from the sidebar and conversation lists. |
| `cast` | Dropdown options that look like `name (group)` are hidden unless they contain a cast name. |
| `banners`, `hideNav` | Hide internal or trial banners and nav items by their text. |
| `orgFrom`/`org`, `initials` | Replace the org name and avatar initials in the header. `orgFrom` must be text no `reps` rule changes first. |

4. **Build and install** with a new flag:
   `python scripts/build_capture.py sanitizer cfg.json __san_v1 san.js`, run
   `san.js` with `browser_run_code_unsafe(filename)` in a fresh context, then
   navigate.

## Typical mappings

| Real | Public |
|---|---|
| Staging or test resource names | Cast names |
| Project, account or environment names | `acme-shop`, `Acme Production` |
| User name, username, email domain | `Alex Morgan`, `alexm`, `@acme.example` |
| Internal hosts (`<name>.<hash>.internal.example.net`) | `app.example.com` |
| GUIDs (account, object, client, thread) | `00000000-0000-0000-0000-000000000000` |
| Random suffixes (`-<hash>`) | `-identity` |
| Internal ticket IDs in titles (`TICKET-123: …`) | Strip the prefix |

## Where leaks hide

- **Input values.** React inputs and combobox values aren't text nodes; the
  sanitizer masks them for display only. React keeps the real value, so if a
  scene edits a masked field, select all and retype.
- **Dropdown options** list every resource you can see. Filter them to the
  cast.
- **Chat and conversation titles** in sidebars and lists, including old test
  chats. Collect them before each scene; new chats get new titles.
- **Assistant or bot replies.** A reply can mention an old persona ("I'm the
  billing team's bot"), access errors, client IDs or real resource names. Fix
  the source first (its instructions, memory or demo data); the sanitizer
  can't rewrite meaning.
- **Images and canvas** (avatars, charts) aren't text. The sanitizer hides
  header images; blur the rest in the editor.
- **Times.** Prompts with future timestamps confuse AI assistants; use past
  times.

## Performance

Full-page scans every few hundred ms froze heavy pages. The template does text
fixes only on mutated nodes, one full walk at start, and a light 250 ms timer
that touches only inputs. Call `window.__sanitizeScan()` before a scene step
if you need a full pass.

## Pitfalls

- Climbing from a banner to its container can reach `<html>` while the page
  loads, which blanks the page. The template stops below `body`/`html`, and
  nav hiding requires width < 300.
- Duplicate mapping (`support-support-comms-bot`) comes from a general rule
  matching an already-replaced name; add a lookbehind.
