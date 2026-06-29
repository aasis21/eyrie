#!/usr/bin/env python3
"""
cortex — generic work HQ installer.

Scaffolds a personal projects HQ into ~/<name> from this checkout and registers a
launch command named <name>. Default name is "cortex"; you may pick one of a few
suggestions or a custom name, so several focused HQs can coexist on one machine.

  cortex (default), neuron, nexus, axon, hub, helm, atlas, or custom

Usage:
    python install.py                 # interactive: choose a name, scaffold ~/<name>
    python install.py --name neuron   # non-interactive name
    python install.py --yes           # accept default name (cortex), no prompts
    python install.py --uninstall     # remove the launch command (keep your HQ data)

User data is preserved on re-runs: registry.json, scratch.md, and
mcp/mcp-config.json are never overwritten. Templates (.github, docs, scripts,
AGENTS.md, README.md) are refreshed. Zero third-party dependencies.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SUGGESTIONS = ["cortex", "neuron", "nexus", "axon", "hub", "helm", "atlas"]
DEFAULT_NAME = "cortex"

# Templates: refreshed on every install. User data: created once, never clobbered.
TEMPLATE = [".github", "scripts", "docs", "AGENTS.md", "README.md", ".gitignore"]
PRESERVE = ["registry.json", "scratch.md", "mcp"]
TEXT_EXTS = (".md", ".html", ".ps1", ".sh", ".json", ".txt")
HQ_TOKEN = "{{HQ_NAME}}"


def rebrand_text(text, name):
    return text.replace(HQ_TOKEN, name)


def rebrand_tree(root, name):
    for dpath, _, files in os.walk(root):
        for fn in files:
            if not fn.lower().endswith(TEXT_EXTS):
                continue
            p = os.path.join(dpath, fn)
            try:
                with open(p, "r", encoding="utf-8") as f:
                    t = f.read()
            except (UnicodeDecodeError, OSError):
                continue
            new = rebrand_text(t, name)
            if new != t:
                with open(p, "w", encoding="utf-8") as f:
                    f.write(new)


def step(msg):
    print(f"\n== {msg} ==")


def ok(msg):
    print(f"  OK  {msg}")


def home():
    return os.path.expanduser("~")


def choose_name(args) -> str:
    if args.name:
        return args.name.strip()
    if args.yes or not sys.stdin.isatty():
        return DEFAULT_NAME
    print("Pick a name for your HQ (folder + command). Several HQs can coexist.")
    for i, s in enumerate(SUGGESTIONS, 1):
        tag = " (default)" if s == DEFAULT_NAME else ""
        print(f"  {i}. {s}{tag}")
    print("  Or type a custom name.")
    raw = input(f"Name [{DEFAULT_NAME}]: ").strip()
    if not raw:
        return DEFAULT_NAME
    if raw.isdigit() and 1 <= int(raw) <= len(SUGGESTIONS):
        return SUGGESTIONS[int(raw) - 1]
    return raw


def scaffold(dest, name):
    os.makedirs(dest, exist_ok=True)
    for item in TEMPLATE:
        src = os.path.join(HERE, item)
        if not os.path.exists(src):
            continue
        dst = os.path.join(dest, item)
        if os.path.isdir(src):
            shutil.rmtree(dst, ignore_errors=True)
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    for item in PRESERVE:
        src = os.path.join(HERE, item)
        dst = os.path.join(dest, item)
        if os.path.exists(dst):
            continue
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        elif os.path.isfile(src):
            shutil.copy2(src, dst)
        elif item == "scratch.md":
            with open(dst, "w", encoding="utf-8") as f:
                f.write("# Scratch — backlog\n\nLoose ideas and 'do later' notes. Triage when ready.\n")
        else:
            os.makedirs(dst, exist_ok=True)
    for item in TEMPLATE:
        rebrand_tree(os.path.join(dest, item), name) if os.path.isdir(os.path.join(dest, item)) else _rebrand_file(os.path.join(dest, item), name)
    ok(f"scaffolded {dest}")


def _rebrand_file(p, name):
    if not os.path.isfile(p):
        return
    try:
        t = open(p, encoding="utf-8").read()
    except (UnicodeDecodeError, OSError):
        return
    new = rebrand_text(t, name)
    if new != t:
        open(p, "w", encoding="utf-8").write(new)


def write_profiles(dest, name):
    ps1 = (
        f"# {name} shell profile (PowerShell)\n"
        f"function {name} {{\n"
        f"    Set-Location \"$HOME\\{name}\"\n"
        f"    copilot --allow-all --additional-mcp-config \"@mcp\\mcp-config.json\" @args\n"
        f"}}\n"
    )
    sh = (
        f"# {name} shell profile (bash)\n"
        f"{name}() {{\n"
        f"    cd \"$HOME/{name}\" && copilot --allow-all --additional-mcp-config \"@mcp/mcp-config.json\" \"$@\"\n"
        f"}}\n"
    )
    with open(os.path.join(dest, "profile.ps1"), "w", encoding="utf-8") as f:
        f.write(ps1)
    with open(os.path.join(dest, "profile.sh"), "w", encoding="utf-8") as f:
        f.write(sh)
    ok("wrote launch command profiles")


def register_command(dest, name):
    line_sh = f'source "$HOME/{name}/profile.sh"'
    bashrc = os.path.join(home(), ".bashrc")
    _append_once(bashrc, line_sh)
    line_ps = f'. "$HOME\\{name}\\profile.ps1"'
    ps_profile = os.environ.get("PROFILE")
    if not ps_profile:
        docs = os.path.join(home(), "Documents")
        ps_profile = os.path.join(docs, "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1")
    os.makedirs(os.path.dirname(ps_profile), exist_ok=True)
    _append_once(ps_profile, line_ps)
    ok(f"command `{name}` registered (restart shell)")


def _append_once(path, line):
    existing = ""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            existing = f.read()
    if line in existing:
        return
    with open(path, "a", encoding="utf-8") as f:
        if existing and not existing.endswith("\n"):
            f.write("\n")
        f.write(line + "\n")


def uninstall(name):
    for path in (os.path.join(home(), ".bashrc"), os.environ.get("PROFILE", "")):
        if path and os.path.exists(path):
            lines = open(path, encoding="utf-8").read().splitlines()
            kept = [l for l in lines if name not in l or "profile." not in l]
            open(path, "w", encoding="utf-8").write("\n".join(kept) + "\n")
    ok(f"removed `{name}` command (HQ folder ~/{name} kept)")


def main():
    ap = argparse.ArgumentParser(description="Install a generic work HQ.")
    ap.add_argument("--name", help="HQ name (default cortex)")
    ap.add_argument("--yes", action="store_true", help="accept default, no prompts")
    ap.add_argument("--uninstall", action="store_true", help="remove launch command")
    args = ap.parse_args()

    if args.uninstall:
        uninstall(args.name or DEFAULT_NAME)
        return
    name = choose_name(args)
    dest = os.path.join(home(), name)
    step(f"Installing HQ '{name}' -> {dest}")
    scaffold(dest, name)
    write_profiles(dest, name)
    register_command(dest, name)
    step("Done")
    print(f"  Launch with: {name}   (or: pwsh {os.path.join(dest, 'scripts', 'launch.ps1')})")


if __name__ == "__main__":
    main()
