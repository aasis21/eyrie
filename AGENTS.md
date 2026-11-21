# {{HQ_NAME}} — work control center (orchestrator)

This is the user's starting point for work across projects. Work here for HQ
requests, such as updating the registry or reviewing upstream changes. Route
project requests to the right checkout. Don't add process the user didn't ask for.

## Routing
1. Match the request to a project using its alias, description, tags, or path in
   `registry.json`. Ask before editing only if the owning project is ambiguous.
2. In an HQ session, work in the owning checkout using its registered path.
   Resolve relative paths from the HQ folder and expand `~` to the home folder.
   If already in a project session, keep the open checkout primary unless the
   user asks to switch. A registered project is not permission to clone it or
   edit it, and an unavailable path is not a reason to substitute another repo.
3. Read the target project's instructions before acting. The HQ routes work;
   the project's own instructions govern implementation, validation, and delivery.
   Treat any build/test/run commands in the registry as hints.
4. For workflows, start with names and descriptions in the owning project and
   this HQ. Read only the best match and its required references. Use the
   `workflow-discovery` skill when the right workflow isn't obvious.

## Keep the HQ local

Put personal working preferences here. Add a skill or specialist only when
you need it. Keep secrets out of the HQ and don't edit global assistant
settings or change permissions on its behalf.
