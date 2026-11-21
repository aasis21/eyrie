#!/usr/bin/env python3
"""Check one HQ registry without modifying files or contacting anything remote."""

import argparse
import json
import stat
from pathlib import Path


def check_registry(registry):
    data = json.loads(registry.read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict) or not isinstance(data.get("projects"), dict):
        raise ValueError("registry must contain a 'projects' object")

    statuses = {}
    for alias, entry in data["projects"].items():
        path = entry.get("path") if isinstance(entry, dict) else None
        if not alias.strip() or not isinstance(path, str) or not path.strip() or "\0" in path:
            raise ValueError(f"{alias!r}: expected a project alias and a non-empty path")
        try:
            directory = registry.parent / Path(path).expanduser()
            exists = stat.S_ISDIR(directory.stat().st_mode)
        except (FileNotFoundError, NotADirectoryError):
            exists = False
        except (OSError, RuntimeError) as error:
            raise ValueError(f"{alias!r}: could not check project path: {error}") from error
        statuses[alias] = "present" if exists else "unavailable"
    return statuses


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("registry", type=Path, help="path to the HQ's registry.json")
    args = parser.parse_args()
    try:
        statuses = check_registry(args.registry)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Registry check failed: {error}\n")
    print(json.dumps({"projects": statuses}, indent=2))


if __name__ == "__main__":
    main()
