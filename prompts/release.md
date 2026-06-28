# Release Prompt

Target project alias: `<alias>`

Read `~\cortex\projects\registry.json`, resolve `<alias>`, and `cd` to that Windows path.

Release target: `<version or channel>`

Checklist:
- Review git status and recent commits.
- Run registry test/build commands needed for release confidence.
- Update version, changelog, or release notes only if this project uses them.
- Confirm no secrets or local-only files are staged.

Prepare the release artifacts or instructions requested by the user.
Report validation, pending risks, and the exact publish or tag command to run.
