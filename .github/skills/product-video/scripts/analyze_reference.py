"""Analyse a reference video's pacing, visuals and audio for style study.

Usage:
  python analyze_reference.py <video.mp4> [--audio <audio file>] [--subs <file.vtt>] [--out <dir>]

Writes into --out (default: next to the video):
  <name>_sheet.png   timestamped contact sheet, one frame every 2 s (read it for scenes and text cards)
  <name>_report.md   duration, voiceover yes/no + transcript, loudness per 4 s, tempo, brightness,
                     accent hits, and suggested Clueso music filters
Needs: imageio-ffmpeg, numpy, pillow (pip install imageio-ffmpeg numpy pillow).
"""
import argparse
import os
import re
import subprocess
import sys
import wave

import imageio_ffmpeg
import numpy as np

FF = imageio_ffmpeg.get_ffmpeg_exe()


def run(args):
    return subprocess.run([FF, "-hide_banner", *args], capture_output=True, text=True)


def contact_sheet(video, out_png):
    if os.name == "nt":
        font = "C\\:/Windows/Fonts/arial.ttf"
    elif sys.platform == "darwin":
        font = "/System/Library/Fonts/Supplemental/Arial.ttf"
    else:
        font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    vf = f"fps=1/2,scale=384:-1,drawtext=fontfile='{font}':text='%{{pts\\:hms}}':x=6:y=6:fontsize=22:fontcolor=red:box=1,tile=6x8"
    run(["-y", "-loglevel", "error", "-i", video, "-vf", vf, "-frames:v", "1", out_png])


def transcript(vtt):
    if not vtt or not os.path.exists(vtt):
        return None
    lines = []
    for line in open(vtt, encoding="utf-8"):
        line = re.sub(r"<[^>]+>", "", line).strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:")) or line.isdigit():
            continue
        if not lines or lines[-1] != line:
            lines.append(line)
    return " ".join(lines)


def audio_stats(src, tmp_wav):
    run(["-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "22050", tmp_wav])
    with wave.open(tmp_wav) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    os.remove(tmp_wav)
    dur = len(x) / sr
    hop = sr // 2
    rms = [20 * np.log10(np.sqrt(np.mean(x[i:i + hop] ** 2)) + 1e-9) for i in range(0, len(x) - hop, hop)]
    frame, step = 1024, 512
    spec = np.array([np.abs(np.fft.rfft(x[i:i + frame] * np.hanning(frame))) for i in range(0, len(x) - frame, step)])
    flux = np.maximum(np.diff(spec, axis=0), 0).sum(1)
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    fps = sr / step
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 70)
    bpm = 60 * fps / (lo + int(np.argmax(ac[lo:hi])))
    centroid = (spec * np.arange(spec.shape[1])).sum(1) / (spec.sum(1) + 1e-9) * sr / frame
    hits = []
    for p in np.where(flux > 4)[0] / fps:
        if not hits or p - hits[-1] > 1.0:
            hits.append(float(p))
    return {
        "dur": dur,
        "peak": 20 * np.log10(np.max(np.abs(x)) + 1e-9),
        "rms": 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9),
        "loud4": [float(np.mean(rms[i:i + 8])) for i in range(0, len(rms), 8)],
        "bpm": bpm,
        "bright8": [float(np.mean(centroid[int(i * fps):int((i + 8) * fps)])) for i in range(0, int(dur), 8)],
        "hits": hits,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--audio", help="separate audio stream (yt-dlp may download video and audio apart)")
    ap.add_argument("--subs", help="captions .vtt")
    ap.add_argument("--out")
    a = ap.parse_args()
    out = a.out or os.path.dirname(os.path.abspath(a.video))
    name = os.path.splitext(os.path.basename(a.video))[0].split(".")[0]
    os.makedirs(out, exist_ok=True)
    sheet = os.path.join(out, f"{name}_sheet.png")
    contact_sheet(a.video, sheet)
    s = audio_stats(a.audio or a.video, os.path.join(out, f"{name}_tmp.wav"))
    text = transcript(a.subs)
    voice = None if text is None else not re.fullmatch(r"(\[\s*music\s*\]\s*)*", text, re.I)
    lift = s["loud4"][len(s["loud4"]) // 2] - s["loud4"][0] if len(s["loud4"]) > 2 else 0
    energy = 4 if s["bpm"] >= 120 else 3 if s["bpm"] >= 95 else 2
    rows = [
        f"# Reference analysis: {name}",
        "",
        f"- Duration: {s['dur']:.1f} s",
        f"- Voiceover: {'unknown (no captions)' if voice is None else 'yes' if voice else 'no (music only)'}",
        f"- Transcript: {(text or '-')[:1500]}",
        f"- Audio: peak {s['peak']:.1f} dBFS, mean RMS {s['rms']:.1f} dBFS, tempo about {s['bpm']:.0f} BPM",
        f"- Loudness per 4 s (dB): {' '.join(f'{v:.0f}' for v in s['loud4'])}",
        f"- Mid-video lift vs start: {lift:+.0f} dB",
        f"- Brightness per 8 s (spectral centroid Hz): {' '.join(f'{v:.0f}' for v in s['bright8'])}",
        f"- Accent hits (s), candidate cut points: {' '.join(f'{h:.1f}' for h in s['hits'][:40])}",
        f"- Contact sheet: {sheet}",
        "",
        "## Suggested Clueso music search",
        f"`find(type='music', energy={energy}, bpm_min={int(s['bpm'] * 0.85)}, bpm_max={int(s['bpm'] * 1.15)}, vocals=false)`",
        "",
        "Read the contact sheet next: list each text card (words, time), when UI first appears, and how scenes change (cut, push-in, pan).",
    ]
    report = os.path.join(out, f"{name}_report.md")
    open(report, "w", encoding="utf-8").write("\n".join(rows) + "\n")
    print("\n".join(rows))


if __name__ == "__main__":
    main()
