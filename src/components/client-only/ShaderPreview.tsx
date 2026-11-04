import { useQuery } from "@tanstack/react-query";
import type {
  ArmySpritesheetData,
  SpritesheetDataByArmy,
} from "frontend/components/match/getSpritesheetData";
import type { ShaderKind } from "frontend/settings/game-settings";
import { Select } from "frontend/ui/Select";
import { Skeleton } from "frontend/ui/Skeleton";
import { useT } from "i18n";
import type { Resource, Texture } from "pixi.js";
import { AnimatedSprite, Application, Container, Sprite } from "pixi.js";
import type { LoadedSpriteSheet } from "pixi/load-spritesheet";
import { loadSpritesFromSpriteMap } from "pixi/load-spritesheet";
import { applyShader } from "pixi/shaders";
import { useEffect, useRef, useState } from "react";

const tilePixels = 16;
const zooms = ["2", "3", "4", "5", "6"];

const sheetNames = ["neutral", "orange-star", "blue-moon"] as const;

const loadPreviewSheets = async () => {
  const entries = await Promise.all(
    sheetNames.map(async (name) => {
      const response = await fetch(`/img/spriteSheet/${name}.json`);
      return [name, (await response.json()) as ArmySpritesheetData] as const;
    }),
  );

  // the preview only uses a few of the sheets of a match
  return loadSpritesFromSpriteMap(Object.fromEntries(entries) as SpritesheetDataByArmy);
};

// Each letter is a tile of the little map of the preview.
const previewMap = ["pprrrpff", "pHprpmpp", "pBprrrpc", "ppfpprpp", "sspcprrr", "ssppfppB"];

const neutralFrames: Record<string, string> = {
  p: "plain-normal.png",
  r: "road-right-left.png",
  f: "forest.png",
  m: "mountain.png",
  s: "sea.png",
  c: "city-0.png",
};

const previewUnits = [
  { x: 3, y: 2, army: "orange-star", type: "tank" },
  { x: 2, y: 3, army: "orange-star", type: "infantry" },
  { x: 5, y: 3, army: "blue-moon", type: "artillery" },
  { x: 6, y: 4, army: "blue-moon", type: "mech" },
] as const;

type Animations = Record<string, Texture<Resource>[]>;

const createPreviewScene = (sheets: LoadedSpriteSheet) => {
  const scene = new Container();

  const addTile = (tile: Sprite, x: number, y: number) => {
    // sprites taller than a tile stick out at the top
    tile.anchor.set(0, 1);
    tile.position.set(x * tilePixels, (y + 1) * tilePixels);
    scene.addChild(tile);
  };

  previewMap.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      const animations = sheets["orange-star"].animations as Animations;

      if (letter === "H" || letter === "B") {
        const frames = letter === "H" ? animations.hq : animations.base;
        addTile(new AnimatedSprite(frames), x, y);
      } else {
        addTile(new Sprite(sheets.neutral.textures[neutralFrames[letter]]), x, y);
      }
    });
  });

  for (const { x, y, army, type } of previewUnits) {
    const unit = new AnimatedSprite((sheets[army].animations as Animations)[type]);
    unit.animationSpeed = 0.07;
    unit.play();
    unit.position.set(x * tilePixels, y * tilePixels);
    scene.addChild(unit);
  }

  return scene;
};

function PreviewCanvas({
  sheets,
  shader,
  zoom,
  label,
}: {
  sheets: LoadedSpriteSheet;
  shader: ShaderKind;
  zoom: number;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    const app = new Application({
      autoDensity: true,
      resolution: Math.max(1, Math.ceil(window.devicePixelRatio)),
      backgroundAlpha: 0,
      width: 8 * tilePixels,
      height: 6 * tilePixels,
    });

    const view = app.view as HTMLCanvasElement;
    view.className = "pixelated @block";
    containerRef.current?.appendChild(view);
    app.stage.addChild(createPreviewScene(sheets));
    appRef.current = app;

    return () => {
      appRef.current = null;
      app.destroy(true, { children: true, texture: false, baseTexture: false });
    };
  }, [sheets]);

  useEffect(() => {
    const app = appRef.current;

    if (app === null) {
      return;
    }

    app.renderer.resize(8 * tilePixels * zoom, 6 * tilePixels * zoom);
    app.stage.scale.set(zoom);
    applyShader(app, shader);
  }, [shader, zoom, sheets]);

  return (
    <figure className="@min-w-0">
      <figcaption className="@mb-1 @text-xs @font-semibold @uppercase @tracking-wide @text-fg-muted">
        {label}
      </figcaption>
      <div
        className="@max-w-full @overflow-auto @border @border-line @bg-canvas"
        role="img"
        aria-label={label}
      >
        <div ref={containerRef} />
      </div>
    </figure>
  );
}

/** The chosen shader next to the original, on a little map with real sprites. */
export function ShaderPreview({ shader }: { shader: ShaderKind }) {
  const t = useT();
  const [zoom, setZoom] = useState("4");

  const { data: sheets, isError } = useQuery({
    queryKey: ["preview-sprite-sheets"],
    queryFn: loadPreviewSheets,
    staleTime: Infinity,
  });

  if (isError) {
    return <p className="@text-sm @text-danger">{t.settings.previewFailed}</p>;
  }

  if (sheets === undefined) {
    return (
      <div>
        <p className="@sr-only" role="status">
          {t.settings.previewLoading}
        </p>
        <Skeleton className="@h-64 @w-full" />
      </div>
    );
  }

  return (
    <div className="@flex @flex-col @gap-3">
      <Select
        label={t.settings.zoom}
        className="@max-w-[10rem]"
        value={zoom}
        onChange={setZoom}
        options={zooms.map((value) => ({ value, label: `${value}×` }))}
      />
      <div className="@flex @flex-wrap @gap-4">
        <PreviewCanvas
          sheets={sheets}
          shader="pixel"
          zoom={Number(zoom)}
          label={t.settings.previewOriginal}
        />
        <PreviewCanvas
          sheets={sheets}
          shader={shader}
          zoom={Number(zoom)}
          label={t.settings.shaders[shader].name}
        />
      </div>
    </div>
  );
}
