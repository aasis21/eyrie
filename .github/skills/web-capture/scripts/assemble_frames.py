"""Assemble timestamped Playwright screenshots (f00012_3456.jpg = frame 12 at 3456 ms) into a 30 fps MP4.

Usage: python assemble_frames.py <frames_dir> <out.mp4>
"""
import os, re, sys, subprocess, imageio_ffmpeg

src, out = sys.argv[1], sys.argv[2]
frames = sorted(
    (int(m.group(2)), f) for f in os.listdir(src)
    if (m := re.match(r"f(\d+)_(\d+)\.jpg$", f))
)
if not frames:
    sys.exit("no frames")
lst = os.path.join(src, "concat.txt")
with open(lst, "w") as fh:
    for i, (t, f) in enumerate(frames):
        nxt = frames[i + 1][0] if i + 1 < len(frames) else t + 66
        fh.write(f"file '{f}'\nduration {max(nxt - t, 1) / 1000:.3f}\n")
    fh.write(f"file '{frames[-1][1]}'\n")
ff = imageio_ffmpeg.get_ffmpeg_exe()
r = subprocess.run([ff, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-vf", "fps=30,format=yuv420p,setsar=1", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "16", "-movflags", "+faststart", out], capture_output=True, text=True)
print("ok" if r.returncode == 0 else r.stderr[-800:], len(frames), "frames", f"{frames[-1][0] / 1000:.1f}s")
