"""Cut scene clips from one recording using a JSON config.

Config shape:
{
  "source": "C:/path/recording.mp4",
  "out_dir": "C:/path/scenes",
  "crop": "1424:904:218:112",            # optional ffmpeg crop w:h:x:y
  "blur": [[1254, 650, 170, 254]],        # optional boxes in cropped coords x,y,w,h
  "scenes": {
    "s01_context": [["0:28", "0:32", 1], ["0:38", "0:46", 1.5]],
    "s02_setup":   [["1:26", "1:31", 2]]
  }
}
Each segment is [start, end, speed]; times are "m:ss" or seconds.
Outputs video-only MP4s (30 fps, CRF 18) and prints each scene's duration.
"""
import json
import os
import subprocess
import sys

import imageio_ffmpeg


def seconds(value):
    if isinstance(value, (int, float)):
        return float(value)
    parts = [float(p) for p in str(value).split(":")]
    total = 0.0
    for part in parts:
        total = total * 60 + part
    return total


def build_filters(cfg, segments):
    chains, labels = [], []
    for i, (start, end, speed) in enumerate(segments):
        steps = [f"trim=start={seconds(start)}:end={seconds(end)}", f"setpts=(PTS-STARTPTS)/{speed}"]
        if cfg.get("crop"):
            steps.append(f"crop={cfg['crop']}")
        chain = f"[0:v]{','.join(steps)}"
        for j, (x, y, w, h) in enumerate(cfg.get("blur", [])):
            chain += f",split[m{i}_{j}][b{i}_{j}];[b{i}_{j}]crop={w}:{h}:{x}:{y},boxblur=20:2[bl{i}_{j}];[m{i}_{j}][bl{i}_{j}]overlay={x}:{y}"
        chain += f",fps=30,format=yuv420p[v{i}]"
        chains.append(chain)
        labels.append(f"[v{i}]")
    return ";".join(chains) + ";" + "".join(labels) + f"concat=n={len(segments)}:v=1:a=0[out]"


def main(config_path):
    with open(config_path, encoding="utf-8") as handle:
        cfg = json.load(handle)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    os.makedirs(cfg["out_dir"], exist_ok=True)
    for name, segments in cfg["scenes"].items():
        out = os.path.join(cfg["out_dir"], f"{name}.mp4")
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", cfg["source"],
               "-filter_complex", build_filters(cfg, segments), "-map", "[out]", "-an",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out]
        result = subprocess.run(cmd, capture_output=True, text=True)
        duration = sum((seconds(e) - seconds(s)) / sp for s, e, sp in segments)
        status = "ok" if result.returncode == 0 else result.stderr[-400:]
        print(f"{name}\t{status}\t{duration:.1f}s")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python cut_scenes.py <config.json>")
    main(sys.argv[1])
