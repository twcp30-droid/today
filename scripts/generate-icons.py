#!/usr/bin/env python3
"""Write PNG app icons without third-party libraries."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public"


def chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: Path, size: int, rgba) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(rgba(x, y, size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def paint(x: int, y: int, size: int, *, padded: bool) -> tuple[int, int, int, int]:
    s = size / 512
    # Safe zone for maskable icons (~80% of canvas).
    inset = size * 0.12 if padded else 0
    inner = size - inset * 2
    lx = (x - inset) / inner if inner else 0
    ly = (y - inset) / inner if inner else 0

    bg = (14, 18, 24)
    if padded and (x < inset or y < inset or x >= size - inset or y >= size - inset):
        return (*bg, 255)

    # Background fill inside the glyph box.
    px, py = lx * 512, ly * 512
    color = [18, 24, 32]

    # Soft vignette
    cx, cy = 256, 248
    dist = ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5
    vig = max(0.0, min(1.0, (dist - 80) / 360))
    color[0] = int(lerp(18, 10, vig))
    color[1] = int(lerp(24, 14, vig))
    color[2] = int(lerp(32, 20, vig))

    # Sun disk
    sun_r = 92
    sun_d = ((px - 256) ** 2 + (py - 214) ** 2) ** 0.5
    if sun_d <= sun_r:
        t = sun_d / sun_r
        color = [
            int(lerp(255, 232, t)),
            int(lerp(210, 184, t)),
            int(lerp(120, 109, t)),
        ]

    # Horizon bar
    if 318 <= py <= 338 and 78 <= px <= 434:
        edge = min(px - 78, 434 - px, py - 318, 338 - py)
        fade = min(1.0, edge / 4)
        teal = (61, 155, 143)
        color = [int(lerp(color[i], teal[i], fade)) for i in range(3)]

    # Tiny tick marks above the horizon (ops-panel feel)
    for tx in (118, 186, 256, 326, 394):
        if abs(px - tx) <= 2.2 * s * 8 and 300 <= py <= 316:
            color = [90, 196, 184]

    return (color[0], color[1], color[2], 255)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    write_png(OUT / "icon-192.png", 192, lambda x, y, s: paint(x, y, s, padded=False))
    write_png(OUT / "icon-512.png", 512, lambda x, y, s: paint(x, y, s, padded=False))
    write_png(OUT / "apple-touch-icon.png", 180, lambda x, y, s: paint(x, y, s, padded=False))
    write_png(
        OUT / "icon-maskable-512.png",
        512,
        lambda x, y, s: paint(x, y, s, padded=True),
    )
    print("wrote icons in", OUT)


if __name__ == "__main__":
    main()
