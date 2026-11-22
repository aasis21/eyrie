"""Generate a branded gradient background PNG (1920x1080 by default).

usage: python gradient_bg.py out.png [--base 07,16,38] [--glow1 24,58,140@250,0] [--glow2 22,120,128@1700,1150]
Colors are r,g,b; positions are x,y in pixels. Defaults give a deep navy with a
blue top-left glow and a teal bottom-right glow; pass your brand kit's colours.
"""
import argparse

import numpy as np
from PIL import Image


def color(text):
    return np.array([float(v) for v in text.split(",")], np.float32)


def glow(text):
    rgb, pos = text.split("@")
    x, y = (float(v) for v in pos.split(","))
    return color(rgb), x, y


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("out")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--base", default="7,16,38")
    parser.add_argument("--glow1", default="24,58,140@250,0")
    parser.add_argument("--glow2", default="22,120,128@1700,1150")
    args = parser.parse_args()

    h, w = args.height, args.width
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.broadcast_to(color(args.base), (h, w, 3)).copy()
    for spec, rx, ry, power, gain in ((args.glow1, 900, 600, 1.8, 0.7), (args.glow2, 1100, 800, 1.6, 0.9)):
        rgb, gx, gy = glow(spec)
        falloff = np.clip(1 - np.hypot((x - gx) / rx, (y - gy) / ry), 0, 1) ** power
        img += rgb * falloff[..., None] * gain
    img += np.random.default_rng(1).normal(0, 1.2, (h, w, 1))
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(args.out)
    print(args.out)


if __name__ == "__main__":
    main()
