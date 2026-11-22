---
name: clueso-setup
description: "Connect Clueso to GitHub Copilot CLI and create a short video from recordings, screenshots, documents, URLs, talking-head footage, or UI designs. Use for Clueso connection/authentication, first-video onboarding, and building Clueso video projects."
---

# Clueso video

Do the work rather than give a tutorial. Keep onboarding brief, ask one numbered
question at a time using the host's question tool, and wait for each answer.
Do not run installation or change configuration for a video-only request if
Clueso is already available.

Clueso is opt-in. Connect it only when the user asks for video work. The
account, workspace and plan (including export minutes and watermark) are the
user's own.

## Connect in Copilot CLI

The endpoint is `https://connect.clueso.io/mcp`, using Streamable HTTP and
OAuth 2.1 authorization code with PKCE and dynamic client registration.
No API key, manually supplied client ID, secret, or npx wrapper is needed.
Google sign-in works; an account need not be created beforehand.
For unexpected authentication behavior, read
`https://www.clueso.io/auth.md` before improvising.

**HQ setup (preferred).** Add Clueso to the HQ's `mcp-config.json` overlay,
which the launcher passes to Copilot on top of the user's normal
configuration. Preserve other entries and never put credentials there:

```json
{
  "mcpServers": {
    "clueso": {
      "type": "http",
      "url": "https://connect.clueso.io/mcp",
      "tools": ["*"]
    }
  }
}
```

**User-wide setup** (only if the user asks). Check the installed CLI's help
before using flags:

```powershell
copilot mcp add --help
copilot mcp add --transport http clueso https://connect.clueso.io/mcp
copilot mcp list
```

This writes the user's Copilot configuration; don't copy another client's
`--scope` flag. For folder-only setup, use the workspace's `.github/mcp.json`
with the same entry. Confirm registration in one line, without claiming
registration proves login.

If tools are not yet exposed, use `/mcp` to reload/reconnect the server, or
restart/resume Copilot if necessary. Discover the actual tools and schemas;
never invent arguments or assume a saved server is callable in this session.

For sign-in, give only this instruction:

> Run /mcp -> clueso -> authenticate -> browser -> come back, say "done".

Use the actual authentication action shown by the installed Copilot UI.
If the browser does not open, print the authorization URL provided by the
client. Never fabricate that URL or expose tokens, codes, or PKCE verifiers.
If the user says already connected, believe them and skip to verification.
Tokens expire: a project resumed days later often starts with a 401, so
verify before any work.

## Verify

Without narrating the call, use `find(type='workspaces')`.

- One workspace: say "Connected to <name>."
- Several: show a numbered list, wait for one selection, then call
  `switch_workspace(workspaceId)` using its actual schema.
- 401: say "Token didn't land - run /mcp and authenticate again."
- 403: say "No access to that workspace - pick another."

Do not start a project until the workspace is resolved.

## First video

Ask exactly this, then wait:

What do you want to make first?
1 Product launch — from a screen recording or screenshots
2 Explainer — from a PDF, PPT, DOCX or URL
3 Talking head — from footage of someone speaking
4 UI animation — from Figma/SVG/PNG or a description
5 Something else

Then ask once for the asset (a path is fine) and how it will be handed over.
Use a supported upload/import tool from the discovered schema. A local path
is not a URL the remote service can fetch. Do not publish private assets to
an external host or upload unrelated files.

Call `find(type='clueprints', query='<what the user asked>')`.
De-duplicate by name, retaining the workspace copy. Show the best two or
three and ask build-from or blank. If none fit, use blank.

- Template: call `get_clueprint(clueprint_id, include='tree')` and retrieve
  its `data.json` through the supported tool before building.
- Blank: call `get_design_guide`.

## Build and deliver

Build the whole short 16:9 video without per-clip check-ins. Follow discovered
tool schemas and the design guide rather than assuming project or upload fields.

For a recording, run `auto_sync(project_id, clip_id)` before voiceover.
Run `voiceover_batch` before adding elements: it retimes clips to audio and
cuts elements past the end. Add elements only after voiceover timing is final.

Check the resulting frames with
`get_clip(project_id, clip_index, select=[], render={})`.
Fix visible or timing problems and verify the saved project. Return its actual
project link. Do not claim a rendered/exported video unless that operation
completed; report authentication, upload, or rendering blockers plainly.

## Going further

For a polished product or launch video from screen recordings (local cutting,
voiceover sync, zooms, logos, pacing, watermark-safe export), load
[production](production.md).
