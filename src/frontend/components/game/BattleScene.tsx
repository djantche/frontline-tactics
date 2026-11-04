import type {
  ArmyBattleSprites,
  BattleManifest,
  SpriteStrip,
  UnitBattleData,
} from "frontend/game/battle-manifest";
import { assetUrl, loadBattleManifest } from "frontend/game/battle-manifest";
import type {
  BattleSideView,
  BattleView,
  SideAction,
  Timeline,
} from "frontend/game/battle-timeline";
import {
  buildTimeline,
  formationPosition,
  sceneHeight,
  sideWidth,
  timings,
  unitCountOf,
} from "frontend/game/battle-timeline";
import { playSound, preloadSounds } from "frontend/game/audio";
import { cx } from "frontend/ui/cx";
import { useT } from "i18n";
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const gap = 4;
const sceneWidth = sideWidth * 2 + gap;
const frameMs = 100;

const images = new Map<string, Promise<HTMLImageElement>>();

const loadImage = (path: string) => {
  let image = images.get(path);

  if (image === undefined) {
    image = new Promise((resolve) => {
      const element = new Image();
      element.onload = () => resolve(element);
      // a missing picture must not block the battle
      element.onerror = () => resolve(element);
      element.src = assetUrl(path);
    });
    images.set(path, image);
  }

  return image;
};

const backgroundPath = (terrain: string) =>
  `images/game/battlesprites/background/back_${terrain}.png`;

const stripsOf = (data: UnitBattleData, sprites: ArmyBattleSprites, manifest: BattleManifest) =>
  [
    sprites.idle,
    sprites.fire,
    sprites.move,
    sprites.stop,
    sprites.dying,
    ...sprites.parts,
    data.flash,
    data.impact,
    manifest.explosions.land,
    manifest.explosions.air,
  ].filter((strip): strip is SpriteStrip => strip !== null);

type Loaded = {
  manifest: BattleManifest;
  timeline: Timeline;
  pictures: Map<string, HTMLImageElement>;
};

const loadBattle = async (view: BattleView): Promise<Loaded> => {
  const manifest = await loadBattleManifest();
  const timeline = buildTimeline(view, manifest);
  preloadSounds(timeline.sounds.map(({ name }) => name));

  const paths = [
    backgroundPath(view.attacker.terrain),
    backgroundPath(view.defender.terrain),
    ...[view.attacker, view.defender].flatMap(({ unitType, army }) =>
      stripsOf(manifest.units[unitType], manifest.units[unitType].armies[army], manifest).map(
        ({ src }) => src,
      ),
    ),
  ];

  const pictures = new Map(
    await Promise.all(
      paths.map(async (path) => [path, await loadImage(path)] as [string, HTMLImageElement]),
    ),
  );

  return { manifest, timeline, pictures };
};

const drawStrip = (
  context: CanvasRenderingContext2D,
  pictures: Map<string, HTMLImageElement>,
  strip: SpriteStrip,
  frame: number,
  x: number,
  bottom: number,
) => {
  const picture = pictures.get(strip.src);

  if (picture === undefined || picture.naturalWidth === 0) {
    return;
  }

  const width = picture.naturalWidth / strip.frames;
  const height = picture.naturalHeight;
  const index = Math.min(frame, strip.frames - 1);

  context.drawImage(
    picture,
    index * width,
    0,
    width,
    height,
    Math.round(x),
    Math.round(sceneHeight - bottom - height),
    width,
    height,
  );
};

/** Draws a frame with its middle on a point, measured from the bottom left of the side. */
const drawCentered = (
  context: CanvasRenderingContext2D,
  pictures: Map<string, HTMLImageElement>,
  strip: SpriteStrip,
  frame: number,
  [centerX, centerY]: [number, number],
) => {
  const picture = pictures.get(strip.src);

  if (picture !== undefined) {
    drawStrip(
      context,
      pictures,
      strip,
      frame,
      centerX - picture.naturalWidth / strip.frames / 2,
      centerY - picture.naturalHeight / 2,
    );
  }
};

// A big unit is wider than its side: its hits and explosions spread over what's visible of it.
const bigUnitSpots: [number, number][] = [
  [0, 0],
  [-26, 16],
  [24, -10],
  [6, 26],
];
const bigUnitSpotDelayMs = 120;

/** Where the hits and the explosion of a member of the formation are drawn. */
const memberCenter = (
  data: UnitBattleData,
  sprites: ArmyBattleSprites,
  index: number,
): [number, number] => {
  const [formationX, formationY] = formationPosition(index, data.maxCount);
  const x = data.position[0] + formationX + sprites.center[0];
  const y = data.position[1] + formationY + sprites.center[1];

  return data.maxCount > 1 ? [x, y] : [Math.max(40, Math.min(sideWidth - 40, x)), y];
};

const activeAction = <Kind extends SideAction["kind"]>(
  actions: SideAction[],
  kind: Kind,
  time: number,
) =>
  actions.find(
    (action): action is Extract<SideAction, { kind: Kind }> =>
      action.kind === kind && time >= action.start && time < action.end,
  );

/** The HP this side shows at this moment. */
export const hpAt = (actions: SideAction[], hpBefore: number, time: number) => {
  let hp = hpBefore;

  for (const action of actions) {
    if (action.kind === "impact" && time >= action.start) {
      const progress = Math.min(1, (time - action.start) / 500);
      hp = action.hpFrom + (action.hpTo - action.hpFrom) * progress;
    }
  }

  return hp;
};

const drawSide = (
  context: CanvasRenderingContext2D,
  { manifest, pictures }: Loaded,
  side: BattleSideView,
  actions: SideAction[],
  time: number,
) => {
  const data = manifest.units[side.unitType];
  const sprites = data.armies[side.army];
  const fire = activeAction(actions, "fire", time);
  const impact = activeAction(actions, "impact", time);

  // the backgrounds only have the ground and the horizon: the sky is behind them
  const sky = context.createLinearGradient(0, 0, 0, sceneHeight / 2);
  sky.addColorStop(0, "#4f8fe0");
  sky.addColorStop(1, "#a9d4f5");
  context.fillStyle = sky;
  context.fillRect(0, 0, sideWidth, sceneHeight);

  const background = pictures.get(backgroundPath(side.terrain));

  if (background !== undefined && background.naturalWidth > 0) {
    context.drawImage(background, 0, 0);
  }

  // the hit shakes the whole side
  const isHit = impact !== undefined && time - impact.start < 400;

  if (isHit) {
    context.translate(Math.sin(time / 18) * 2, Math.cos(time / 23) * 1.5);
  }

  const impacts = actions.filter(
    (action): action is Extract<SideAction, { kind: "impact" }> => action.kind === "impact",
  );
  const lastImpact = [...impacts].reverse().find(({ start }) => time >= start);

  const startHp = impacts[0]?.hpFrom ?? side.hpBefore;
  const startCount = unitCountOf(startHp, data.maxCount);
  const moveIn = actions.find(({ kind }) => kind === "moveIn");

  // Front units have the highest index and are drawn last.
  const members: { index: number; isLost: boolean }[] = [];
  const remaining =
    lastImpact === undefined ? startCount : unitCountOf(lastImpact.hpTo, data.maxCount);

  for (let order = startCount - 1; order >= 0; order--) {
    members.push({ index: data.maxCount - order, isLost: order >= remaining });
  }

  const explosion =
    data.kind === "air" || data.kind === "copter"
      ? manifest.explosions.air
      : manifest.explosions.land;

  members.forEach(({ index, isLost }, memberOrder) => {
    const [formationX, formationY] = formationPosition(index, data.maxCount);
    const delay = memberOrder * timings.unitDelayMs;
    let x = data.position[0] + formationX;
    const bottom = data.position[1] + formationY;

    let strip = sprites.idle;
    let frame = Math.floor(time / (frameMs * 2));

    if (moveIn !== undefined && time < moveIn.end) {
      strip = sprites.move ?? sprites.idle;
      frame = Math.floor(time / frameMs) % (strip?.frames ?? 1);
      const progress = Math.max(0, (time - moveIn.start) / (moveIn.end - moveIn.start));
      x -= 65 * (1 - progress);
    } else if (fire !== undefined && sprites.fire !== null) {
      strip = sprites.fire;
      frame = Math.max(0, Math.floor((time - fire.start - delay) / frameMs));
    }

    const explosionStart =
      lastImpact === undefined ? Infinity : lastImpact.start + timings.hitToExplosionMs + delay;
    // The explosion replaces the unit. A big one needs a first blast to hide that it's gone.
    const isGone = isLost && time >= explosionStart + (data.maxCount > 1 ? 0 : bigUnitSpotDelayMs);

    if (strip !== null && !isGone) {
      drawStrip(
        context,
        pictures,
        strip,
        strip === sprites.idle ? frame % strip.frames : frame,
        x,
        bottom,
      );

      for (const part of sprites.parts) {
        const partFrame =
          fire === undefined ? 0 : Math.max(0, Math.floor((time - fire.start) / frameMs));

        drawStrip(context, pictures, part, partFrame, x + part.offset[0], bottom + part.offset[1]);
      }
    }

    if (fire !== undefined && data.flash !== null && !isGone) {
      const sinceFire = time - fire.start - delay;
      const [travelX, travelY, travelMs] = data.flashTravel ?? [0, 0, data.flash.frames * 60];

      if (sinceFire >= 0 && sinceFire < travelMs) {
        const offset = data.flashOffset ?? [0, 0];
        const progress = sinceFire / travelMs;

        drawStrip(
          context,
          pictures,
          data.flash,
          Math.floor(sinceFire / 60) % data.flash.frames,
          formationX + offset[0] + travelX * progress,
          formationY + offset[1] + travelY * progress,
        );
      }
    }

    if (isLost) {
      const center = memberCenter(data, sprites, index);
      const spots = data.maxCount > 1 ? [bigUnitSpots[0]] : bigUnitSpots;

      spots.forEach(([spotX, spotY], spot) => {
        const sinceBlast = time - explosionStart - spot * bigUnitSpotDelayMs;
        const blastFrame = Math.floor((sinceBlast / timings.explosionMs) * explosion.frames);

        if (sinceBlast >= 0 && blastFrame < explosion.frames) {
          drawCentered(context, pictures, explosion, blastFrame, [
            center[0] + spotX,
            center[1] + spotY,
          ]);
        }
      });
    }
  });

  return impact;
};

const drawImpacts = (
  context: CanvasRenderingContext2D,
  { manifest, pictures }: Loaded,
  shooter: BattleSideView,
  target: BattleSideView,
  impact: Extract<SideAction, { kind: "impact" }>,
  time: number,
) => {
  const strip = manifest.units[shooter.unitType].impact;

  if (strip === null) {
    return;
  }

  const targetData = manifest.units[target.unitType];
  const sprites = targetData.armies[target.army];
  const count = Math.max(1, unitCountOf(impact.hpFrom, targetData.maxCount));
  const remaining = unitCountOf(impact.hpTo, targetData.maxCount);
  const spots = targetData.maxCount > 1 ? 1 : bigUnitSpots.length;

  for (let order = 0; order < count; order++) {
    const center = memberCenter(targetData, sprites, targetData.maxCount - order);

    for (let spot = 0; spot < spots; spot++) {
      const sinceHit = time - impact.start - (order + spot) * timings.unitDelayMs;
      const frame = Math.floor(sinceHit / 70);
      // the explosion takes over on the units that are lost
      const isOver = order >= remaining && time - impact.start >= timings.hitToExplosionMs;

      if (frame >= 0 && frame < strip.frames && !isOver) {
        drawCentered(context, pictures, strip, frame, [
          center[0] + bigUnitSpots[spot][0],
          center[1] + bigUnitSpots[spot][1],
        ]);
      }
    }
  }
};

function SideHud({
  side,
  hp,
  manifest,
  alignRight,
}: {
  side: BattleSideView;
  hp: number;
  manifest: BattleManifest;
  alignRight: boolean;
}) {
  const t = useT();
  const face = manifest.cos[side.co]?.face;
  const visualHp = Math.ceil(hp / 10);

  return (
    <div
      className={cx(
        "@absolute @top-0 @flex @items-start @gap-1 @p-1",
        alignRight ? "@right-0 @flex-row-reverse" : "@left-0",
      )}
      style={{ width: sideWidth }}
    >
      {face !== undefined && (
        <div
          aria-hidden
          className="pixelated @h-[36px] @w-[36px] @shrink-0 @border @border-black/60"
          style={{
            backgroundImage: `url("${assetUrl(face)}")`,
            backgroundSize: "108px 36px",
            backgroundPosition: hp <= 0 ? "-72px 0" : "0 0",
            // all the portraits look to the right, and the two COs face each other
            transform: alignRight ? "scaleX(-1)" : undefined,
          }}
        />
      )}
      <div className={cx("@min-w-0 @flex-1", alignRight && "@text-right")}>
        <div className="@h-[6px] @border @border-black/70 @bg-black/50">
          <div
            className={cx(
              "@h-full",
              hp > 50 ? "@bg-success" : hp > 20 ? "@bg-warning" : "@bg-danger",
              alignRight && "@ml-auto",
            )}
            style={{ width: `${hp}%` }}
          />
        </div>
        <div
          className={cx("@mt-0.5 @flex @items-center @gap-1", alignRight && "@flex-row-reverse")}
        >
          <span
            className="@font-display @text-[22px] @font-bold @leading-none @text-white"
            style={{
              textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
            }}
          >
            {visualHp}
          </span>
          <span
            className="@flex @items-center @gap-px @bg-black/60 @px-0.5 @py-px"
            aria-label={`${t.game.defense} ${side.stars}`}
          >
            {Array.from({ length: Math.max(side.stars, 1) }, (_, index) => (
              <Star
                key={index}
                className={cx(
                  "@h-[6px] @w-[6px]",
                  side.stars === 0 ? "@text-fg-subtle" : "@fill-warning @text-warning",
                )}
                aria-hidden
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  view: BattleView;
  onEnd: () => void;
};

/** The split screen fight of Advance Wars, shown for every attack. A click skips it. */
export function BattleScene({ view, onEnd }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<Loaded>();
  const [hp, setHp] = useState({
    attacker: view.attacker.hpBefore,
    defender: view.defender.hpBefore,
  });
  const [scale, setScale] = useState(2);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    let isCurrent = true;

    void loadBattle(view).then((battle) => {
      if (isCurrent) {
        setLoaded(battle);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [view]);

  useEffect(() => {
    const fit = () => {
      setScale(
        Math.max(
          1,
          Math.floor(
            Math.min(window.innerWidth / sceneWidth, window.innerHeight / sceneHeight) * 2,
          ) / 2,
        ),
      );
    };

    fit();
    window.addEventListener("resize", fit);

    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (loaded === undefined) {
      return;
    }

    const context = canvasRef.current?.getContext("2d");

    if (context === null || context === undefined) {
      return;
    }

    context.imageSmoothingEnabled = false;

    const start = performance.now();
    const { timeline } = loaded;
    const pending = [...timeline.sounds].sort((a, b) => a.at - b.at);
    let frame = 0;

    const draw = (now: number) => {
      const time = now - start;

      while (pending.length > 0 && pending[0].at <= time) {
        playSound(pending.shift()!.name);
      }

      context.clearRect(0, 0, sceneWidth, sceneHeight);

      context.save();
      const attackerImpact = drawSide(context, loaded, view.attacker, timeline.attacker, time);

      if (attackerImpact !== undefined) {
        drawImpacts(context, loaded, view.defender, view.attacker, attackerImpact, time);
      }

      context.restore();

      // the right side is the same picture, mirrored
      context.save();
      context.translate(sceneWidth, 0);
      context.scale(-1, 1);
      context.beginPath();
      context.rect(0, 0, sideWidth, sceneHeight);
      context.clip();
      const defenderImpact = drawSide(context, loaded, view.defender, timeline.defender, time);

      if (defenderImpact !== undefined) {
        drawImpacts(context, loaded, view.attacker, view.defender, defenderImpact, time);
      }

      context.restore();

      setHp({
        attacker: hpAt(timeline.attacker, view.attacker.hpBefore, time),
        defender: hpAt(timeline.defender, view.defender.hpBefore, time),
      });

      if (time >= timeline.end) {
        onEndRef.current();
        return;
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, [loaded, view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onEndRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      role="dialog"
      aria-label={t.game.battle}
      className="game-battle-in @fixed @inset-0 @z-40 @flex @cursor-pointer @items-center @justify-center @bg-black/85"
      onClick={onEnd}
    >
      <div style={{ width: sceneWidth * scale, height: sceneHeight * scale }}>
        <div
          className="@relative @origin-top-left"
          style={{ width: sceneWidth, height: sceneHeight, transform: `scale(${scale})` }}
        >
          <canvas
            ref={canvasRef}
            width={sceneWidth}
            height={sceneHeight}
            className="pixelated @block @bg-black"
          />
          {loaded !== undefined && (
            <>
              <SideHud
                side={view.attacker}
                hp={hp.attacker}
                manifest={loaded.manifest}
                alignRight={false}
              />
              <SideHud
                side={view.defender}
                hp={hp.defender}
                manifest={loaded.manifest}
                alignRight
              />
            </>
          )}
        </div>
      </div>
      <p className="@absolute @bottom-3 @text-xs @text-fg-muted">{t.game.battleSkip}</p>
    </div>
  );
}
