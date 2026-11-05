"""Pack existing Commander Wars indexed terrain strips, without changing pixels.

The original masks and palettes live under public/commander-wars. RGB stores
palette coordinates, not display colours; coastal-atlas.ts applies those palettes.
Run from the repository root with Python 3 and Pillow. No runtime Python required.
Source: github.com/Robosturm/Commander_Wars (resources/scripts/terrain/BEACH.js,
SEA.js and system/frac_matrix_shader.glsl). Existing asset attribution applies.
"""
import json
import math
import re
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "public/commander-wars/images/terrain"
files = list((source / "beach").glob("*.png")) + list((source / "reaf").glob("*.png"))
files += [p for p in (source / "sea").glob("*.png")
          if re.fullmatch(r"sea(?:\+(?:N|E|S|W|NE|SE|SW|NW|bridge))*\+mask", p.stem)]
files.sort(key=lambda p: p.stem)
columns, strip_width, tile = 8, 128, 16
atlas = Image.new("RGBA", (columns * strip_width, math.ceil(len(files) / columns) * tile))
frames, animations = {}, {}
for i, path in enumerate(files):
    image = Image.open(path).convert("RGBA")
    assert image.size == (strip_width, tile), (path, image.size)
    x, y = (i % columns) * strip_width, (i // columns) * tile
    atlas.paste(image, (x, y))
    animation = []
    for frame in range(8):
        name = f"{path.stem}-{frame}.png"
        frames[name] = {"frame": {"x": x + frame * tile, "y": y, "w": tile, "h": tile},
                        "rotated": False, "trimmed": False,
                        "sourceSize": {"w": tile, "h": tile}}
        animation.append(name)
    animations[path.stem] = animation
output = root / "public/img/spriteSheet"
atlas.save(output / "coast-mask.png", optimize=True)
metadata = {"frames": frames, "animations": animations,
            "meta": {"image": "coast-mask.png", "scale": "1", "size": {"w": atlas.width, "h": atlas.height},
                     "source": "https://github.com/Robosturm/Commander_Wars", "indexedPalette": True}}
(output / "coast.json").write_text(json.dumps(metadata, separators=(",", ":")) + "\n")
print(f"Packed {len(files)} coastal variants / {len(frames)} animation frames ({atlas.width}x{atlas.height}).")
