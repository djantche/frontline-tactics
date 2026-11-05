#!/usr/bin/env python3
"""Imports the images, sounds and music of Commander Wars into public/commander-wars.

Usage: python3 -I import.py <path to a Commander_Wars checkout> <path to public/commander-wars>

Only media files and texts are copied. The scripts of the game are never executed: they are
read as text, to extract how each unit is animated into battle-manifest.json.

The battle sprites of Commander Wars are masks that its engine recolors in a shader, using
a color table per army indexed by the red and green of the mask. They are baked here for our
armies, so the browser can draw them directly.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

source = Path(sys.argv[1]) / "resources"
target = Path(sys.argv[2])

COPIED = {
    "images": {".png", ".PNG", ".jpg"},
    "sounds": {".wav"},
    "music": {".ogg"},
}

ARMIES = {
    "orange-star": ("os", "orange_star"),
    "blue-moon": ("bm", "blue_moon"),
    "green-earth": ("ge", "green_earth"),
    "yellow-comet": ("yc", "yellow_comet"),
    "black-hole": ("bh", "black_hole"),
}

# our unit type -> (Commander Wars unit id, kind of explosion)
UNITS = {
    "infantry": ("INFANTRY", "foot"),
    "mech": ("MECH", "foot"),
    "recon": ("RECON", "land"),
    "apc": ("APC", "land"),
    "artillery": ("ARTILLERY", "land"),
    "tank": ("LIGHT_TANK", "land"),
    "antiAir": ("FLAK", "land"),
    "missile": ("MISSILE", "land"),
    "rocket": ("ROCKETTHROWER", "land"),
    "mediumTank": ("HEAVY_TANK", "land"),
    "pipeRunner": ("PIPERUNNER", "land"),
    "neoTank": ("NEOTANK", "land"),
    "megaTank": ("MEGATANK", "land"),
    "transportCopter": ("T_HELI", "copter"),
    "battleCopter": ("K_HELI", "copter"),
    "fighter": ("FIGHTER", "air"),
    "bomber": ("BOMBER", "air"),
    "stealth": ("STEALTHBOMBER", "air"),
    "blackBomb": ("BLACK_BOMB", "air"),
    "blackBoat": ("BLACK_BOAT", "sea"),
    "lander": ("LANDER", "sea"),
    "cruiser": ("CRUISER", "sea"),
    "sub": ("SUBMARINE", "sea"),
    "battleship": ("BATTLESHIP", "sea"),
    "carrier": ("AIRCRAFTCARRIER", "sea"),
}

# Where each unit stands and fires, read from its script in scripts/battleanimations. These
# scripts mix their numbers in tables of their own, so a pattern can't find them reliably.
# position: where the sprite stands, from the bottom left of the side, in standing order.
# shot: (sprite, where it starts from the formation point, (distance x, y, ms) if it flies).
# parts: pieces drawn on top of the sprite, that move when it fires (suffix, offset).
PLACEMENTS = {
    "infantry": {"position": [-10, 5], "shot": ("mg_shot", [14, 13], None)},
    "mech": {"position": [-10, 5], "shot": ("bazooka_os", [18, 17], [160, 0, 500])},
    "recon": {"position": [-5, 5], "shot": ("mg_shot", [35, 44], None)},
    "apc": {"position": [10, 10], "shot": None},
    "artillery": {"position": [-5, 5], "shot": ("artillery_shot", [40, 38], None)},
    "tank": {"position": [-15, 5], "shot": ("light_shot", [13, 24], None)},
    "antiAir": {"position": [-10, 5], "shot": ("mg_shot+flak", [31, 26], None)},
    "missile": {"position": [-10, 5], "shot": ("rocket_up", [11, 35], [128, 64, 400])},
    "rocket": {"position": [-10, 5], "shot": ("rocket_up", [0, 31], [128, 64, 400])},
    "mediumTank": {"position": [-25, 5], "shot": ("medium_shot", [15, 22], None)},
    "pipeRunner": {"position": [0, 30], "shot": ("pipe_rocket_up", [50, 82], [128, 64, 400])},
    "neoTank": {"position": [-15, 5], "shot": ("medium_shot", [25, 23], None)},
    "megaTank": {
        "position": [0, 10],
        "shot": ("medium_shot", [102, 80], None),
        "parts": [("+cannon", [64, 32])],
    },
    "transportCopter": {"position": [0, 40], "shot": None},
    "battleCopter": {
        "position": [-30, 30],
        "shot": ("rocket", [-40, 32], [130, -80, 600]),
        "parts": [("+mg+fire", [40, 0])],
    },
    "fighter": {"position": [-40, 20], "shot": ("rocket", [-70, 30], [227, 0, 800])},
    "bomber": {"position": [-65, 40], "shot": ("bombs_projectile", [70, 60], [0, -160, 800])},
    "stealth": {"position": [0, 60], "shot": ("rocket", [45, 62], [128, 0, 400])},
    "blackBomb": {"position": [-1, 40], "shot": None},
    "blackBoat": {"position": [-25, 20], "shot": None},
    "lander": {"position": [-33, 20], "shot": None},
    "cruiser": {
        "position": [-65, 20],
        "shot": ("flak_shot", [100, 58], None),
        "parts": [("+missile", [80, 32]), ("+cannon+fire+air", [144, 32])],
    },
    "sub": {"position": [-60, 20], "shot": ("torpedo", [70, 30], [60, 0, 400])},
    "battleship": {
        "position": [-100, 20],
        "shot": ("battleship_shot", [108, 97], None),
        "parts": [("+fire", [160, 64])],
    },
    "carrier": {"position": [-130, 20], "shot": ("rocket_up", [40, 75], [128, 64, 500])},
}

# The COs of the official GBA and DS games. Commander Wars has many more: they are fan made.
COS = [
    "adder", "andy", "sami", "max", "hawke", "sturm", "lash", "flak", "kanbei", "sonja", "sensei",
    "colin", "drake", "eagle", "nell", "hachi", "olaf", "grit", "jess", "kindle", "grimm", "jake",
    "javier", "jugger", "koal", "von-bolt", "sasha", "rachel", "brenner", "caulder", "forsythe",
    "gage", "greyfield", "isabella", "lin", "penny", "tabitha", "tasha", "waylon", "will",
]

# Themes of fan made COs, in the same folder as the official ones.
FAN_MADE_THEMES = {
    "adam", "aira", "alexander", "alexis", "amy", "beast", "carmen", "carrie", "cassidy", "conrad",
    "davis", "epoch", "graves", "ik-486-b7", "joey", "julia", "koshi", "mary", "meiyo", "melanthe",
    "mina", "minamoto", "nana", "napoleon", "ozzy", "peter", "rattigan", "roboandy", "robosturm",
    "sabaki", "sanjuro", "smitan", "sophie", "varlot", "walter", "xavier", "yukio", "zandra",
}


def is_fan_made(file):
    """Fan made COs, and the alternate looks that the game gives to the official ones."""
    name, *variant = file.stem.split("+")

    if file.parent.name == "cos":
        return name in FAN_MADE_THEMES

    if "co" not in file.parts or not name.startswith("co_"):
        return False

    return name[3:].replace("_", "-") not in COS or any(part.startswith("alt") for part in variant)


def copy_media():
    for folder, extensions in COPIED.items():
        for file in (source / folder).rglob("*"):
            if file.is_file() and file.suffix in extensions and not is_fan_made(file):
                destination = target / folder / file.relative_to(source / folder)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, destination)

    shutil.copyfile(source.parent / "LICENSE", target / "LICENSE")
    shutil.copyfile(source / "credits" / "credits.cred", target / "CREDITS.txt")
    (target / "fonts").mkdir(exist_ok=True)
    shutil.copyfile(
        source / "fonts" / "Advance_Wars_2_Font_Expanded.ttf",
        target / "fonts" / "Advance_Wars_2_Font_Expanded.ttf",
    )


battle_images = source / "images" / "battleanimations"

frame_counts = {}
for match in re.finditer(
    r'<image file="([^"]+)"([^/]*)/>', (battle_images / "res.xml").read_text(errors="ignore")
):
    cols = re.search(r'cols\s*=\s*"(\d+)"', match[2])
    frame_counts[match[1]] = int(cols[1]) if cols else 1

files_by_name = {Path(path).name[:-4]: path for path in frame_counts}

tables = {
    table: Image.open(source / "images" / "colortables" / f"{table}.png").convert("RGBA")
    for _, table in ARMIES.values()
}


def bake(mask_path, table_name, baked_path):
    """Applies the color table to a mask, and puts its uncolored details on top."""
    destination = target / "baked" / baked_path

    if destination.exists():
        return

    mask = Image.open(battle_images / mask_path).convert("RGBA")
    table = tables[table_name]
    table_pixels = table.load()
    width, height = mask.size
    pixels = mask.load()

    for y in range(height):
        for x in range(width):
            red, green, _, alpha = pixels[x, y]
            if alpha > 0:
                color = table_pixels[red * table.width // 256, green * table.height // 256]
                pixels[x, y] = (color[0], color[1], color[2], alpha)

    details = battle_images / mask_path.replace("+mask.png", ".png")

    if details.exists():
        mask.alpha_composite(Image.open(details).convert("RGBA"))

    destination.parent.mkdir(parents=True, exist_ok=True)
    mask.save(destination)


def find_sprite(base, army_code, suffix):
    """A sprite exists per army, or once for all armies."""
    for name in (
        f"{base}+{army_code}{suffix}+mask",
        f"{base}+os{suffix}+mask",
        f"{base}{suffix}+mask",
    ):
        if name in files_by_name:
            return files_by_name[name]

    return None


def sprite_entry(base, army, suffixes):
    army_code, table = ARMIES[army]

    for suffix in suffixes:
        mask_path = find_sprite(base, army_code, suffix)

        if mask_path is not None:
            baked_path = mask_path.replace("+mask.png", f"@{army_code}.png")
            bake(mask_path, table, baked_path)
            return {"src": f"baked/{baked_path}", "frames": frame_counts[mask_path]}

    return None


def body_center(strip):
    """The middle of the drawn pixels of the first frame, from the bottom left of the sprite."""
    picture = Image.open(target / strip["src"])
    width = picture.width // strip["frames"]
    left, top, right, bottom = picture.crop((0, 0, width, picture.height)).getbbox()
    return [(left + right) // 2, picture.height - (top + bottom) // 2]


def general_sprite(name):
    path = files_by_name.get(name)

    if path is None:
        return None

    return {"src": f"images/battleanimations/{path}", "frames": frame_counts[path]}


def function_body(script, name):
    start = script.find(f"this.{name} = function")

    if start == -1:
        return ""

    end = script.find("this.", start + 10)
    return script[start : end if end != -1 else None]


def sounds_of(body):
    found = []
    for sound in re.findall(r'loadSound\("([^"]+)"', body):
        if sound not in found:
            found.append(sound)
    return found


def sprites_of(body):
    return re.findall(r'load\w*Sprite\w*\("([^"+]+)"', body)


def unit_entry(unit, unit_id, kind):
    script = (source / "scripts" / "battleanimations" / f"BATTLEANIMATION_{unit_id}.js").read_text(
        errors="ignore"
    )

    max_count = re.search(r"getMaxUnitCount = function\(\)\s*\{\s*return (\d+)", script)
    max_count = int(max_count[1]) if max_count else 1

    base = re.search(r'load\w*Sprite\w*\("(\w+)(?:\+|")', function_body(script, "loadSprite"))
    if base is None:
        base = re.search(r'"(\w+)\+(?:" \+ armyName|mask)', script)
    base = base[1]

    fire = function_body(script, "loadFireAnimation")
    impact = function_body(script, "loadImpactAnimation")
    impact_names = [name for name in sprites_of(impact) if "hit" in name and name in files_by_name]
    impact_name = impact_names[-1] if impact_names else "cannon_hit"
    # the sound of what's flying in only makes sense with a projectile, which we don't draw
    impact_sounds = [sound for sound in sounds_of(impact) if "flying" not in sound]
    impact_sounds = [sound for sound in impact_sounds if "_move" not in sound]
    if not impact_sounds:
        impact_sounds = (
            ["mg_impact.wav"] if impact_name == "mg_hit" else ["tank_hit.wav", "impact_explosion.wav"]
        )

    fire_ms = re.search(r"getFireDurationMS[^}]*?return (\d+)", script)

    placement = PLACEMENTS[unit]
    part_definitions = placement.get("parts", [])
    part_suffixes = {suffix for suffix, _ in part_definitions}
    fire_suffixes = [suffix for suffix in ("+fire", "+cannon+fire") if suffix not in part_suffixes]

    armies = {}
    for army in ARMIES:
        parts = []
        for suffix, offset in part_definitions:
            part = sprite_entry(base, army, [suffix])
            if part is not None:
                parts.append({**part, "offset": offset})

        idle = sprite_entry(base, army, [""])

        armies[army] = {
            "idle": idle,
            "center": body_center(idle),
            "fire": sprite_entry(base, army, fire_suffixes),
            "move": sprite_entry(base, army, ["+move", "+walk"]),
            "stop": sprite_entry(base, army, ["+stop"]),
            "dying": sprite_entry(base, army, ["+dying"]),
            "parts": parts,
        }

    shot = placement["shot"]

    return {
        "kind": kind,
        "maxCount": max_count,
        "fireMs": int(fire_ms[1]) if fire_ms else 600,
        "fireSounds": sounds_of(fire)[:2],
        "position": placement["position"],
        "flash": general_sprite(shot[0]) if shot else None,
        "flashOffset": shot[1] if shot else None,
        "flashTravel": shot[2] if shot else None,
        "impact": general_sprite(impact_name),
        "impactSounds": impact_sounds[:2],
        "armies": armies,
    }


def co_entry(co):
    file_name = "co_" + co.replace("-", "_")
    faces = sorted((source / "images" / "co").rglob(f"{file_name}+face.png"))
    entry = {}

    if faces:
        folder = faces[0].parent.relative_to(source / "images")
        entry["face"] = f"images/{folder}/{file_name}+face.png"
        entry["full"] = f"images/{folder}/{file_name}+nrm.png"

        # the first face of the sheet, for the small portraits of the app
        sheet = Image.open(faces[0]).convert("RGBA")
        portraits = target / "portraits"
        portraits.mkdir(exist_ok=True)
        sheet.crop((0, 0, sheet.height, sheet.height)).save(portraits / f"{co}.png")

    music = source / "music" / "cos" / f"{co.replace('-', '_')}.ogg"
    if music.exists():
        entry["music"] = f"music/cos/{music.name}"

    return entry


target.mkdir(parents=True, exist_ok=True)
copy_media()

manifest = {
    "units": {unit: unit_entry(unit, *definition) for unit, definition in UNITS.items()},
    "cos": {co: co_entry(co) for co in COS},
    "explosions": {
        "land": general_sprite("unit_explosion"),
        "air": general_sprite("unit_explosion_air"),
    },
}

(target / "battle-manifest.json").write_text(json.dumps(manifest, indent=1))
print("units", len(manifest["units"]), "cos", len(manifest["cos"]))
