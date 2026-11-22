"""Build runnable Playwright MCP files from the web-capture templates.

Sanitizer:
  python build_capture.py sanitizer <config.json> <flag> <out.js>
    flag: a new identifier per config change (e.g. __san_v3); re-installing needs a fresh context.

Scene:
  python build_capture.py scene <actions.js> <frames_dir> <out.js> [frame_regex]
    actions.js: the scene body (uses f, glide, click, type, hold, tours, settle, mark).
    frame_regex: app iframe URL regex source, e.g. "app\\.example\\.com" ('' = main frame).

Write outputs under a folder the Playwright MCP may read: the task's folder in the HQ's
generated-output location (outside any repository).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    print("wrote", path)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    kind = sys.argv[1]
    if kind == "sanitizer" and len(sys.argv) == 5:
        cfg = json.load(open(sys.argv[2], encoding="utf-8"))
        cfg.pop("_comment", None)
        text = read("sanitize.tpl.js").replace("__CFG__", json.dumps(cfg, ensure_ascii=False)).replace("__FLAG__", sys.argv[3])
        write(sys.argv[4], text)
    elif kind == "scene" and len(sys.argv) in (5, 6):
        actions = open(sys.argv[2], encoding="utf-8").read()
        frames = os.path.abspath(sys.argv[3]).replace("\\", "/")
        os.makedirs(frames, exist_ok=True)
        frame_re = sys.argv[5] if len(sys.argv) == 6 else ""
        text = read("scene-template.js").replace("__DIR__", frames).replace("__FRAME_RE__", frame_re.replace("\\", "\\\\")).replace("__ACTIONS__", actions)
        write(sys.argv[4], text)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
