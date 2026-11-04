import { aw2COs, coDisplayName } from "frontend/game/aw2-cos";
import { Card } from "frontend/ui/Card";
import { COPortrait } from "frontend/ui/COPortrait";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Page, PageHeader } from "frontend/ui/Page";
import { Select } from "frontend/ui/Select";
import { Table, Td, Th } from "frontend/ui/Table";
import { Tabs } from "frontend/ui/Tabs";
import { UnitSprite } from "frontend/ui/UnitSprite";
import { useT } from "i18n";
import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { getCOProperties } from "shared/match-logic/co";
import { damageChartAW2 } from "shared/match-logic/game-constants/base-damage";
import { terrainProperties } from "shared/match-logic/game-constants/terrain-properties";
import type { Facility } from "shared/match-logic/game-constants/unit-properties";
import { unitPropertiesMap } from "shared/match-logic/game-constants/unit-properties";
import type { Tile } from "shared/schemas/tile";
import type { UnitType } from "shared/schemas/unit";
import { unitTypes } from "shared/schemas/unit";

type SectionId = keyof ReturnType<typeof useT>["guide"]["sections"];

const sectionIds: SectionId[] = [
  "objective",
  "turn",
  "units",
  "terrain",
  "combat",
  "economy",
  "cos",
  "weather",
  "controls",
];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const t = useT();

  return (
    <section
      id={id}
      className="@scroll-mt-20 @border-t @border-line @py-8 first:@border-t-0 first:@pt-0"
    >
      <h2 className="@mb-3 @text-3xl">{t.guide.sections[id]}</h2>
      <div className="@flex @flex-col @gap-3 @text-sm @leading-relaxed @text-fg-muted">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="@flex @flex-col @gap-1.5">
      {items.map((item) => (
        <li key={item} className="@flex @gap-2">
          <span className="@mt-2 @h-1.5 @w-1.5 @shrink-0 @bg-accent" aria-hidden />
          <span className="@text-fg">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoCards({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="@grid @gap-3 smallscreen:@grid-cols-2">
      {items.map(({ title, text }) => (
        <Card key={title} className="@p-3">
          <h3 className="@text-lg @leading-tight @text-fg">{title}</h3>
          <p className="@mt-1 @text-sm">{text}</p>
        </Card>
      ))}
    </div>
  );
}

function UnitsTable({ facility }: { facility: Facility }) {
  const t = useT();
  const labels = t.guide.units;
  const types = unitTypes.filter((type) => unitPropertiesMap[type].facility === facility);

  return (
    <Table>
      <thead>
        <tr>
          <Th>{labels.name}</Th>
          <Th className="@text-right">{labels.cost}</Th>
          <Th className="@text-right">{labels.move}</Th>
          <Th className="@text-right">{labels.range}</Th>
          <Th className="@text-right">{labels.vision}</Th>
          <Th className="@text-right">{labels.fuel}</Th>
          <Th className="@text-right">{labels.ammo}</Th>
        </tr>
      </thead>
      <tbody>
        {types.map((type) => {
          const properties = unitPropertiesMap[type];
          const range = "attackRange" in properties ? properties.attackRange : undefined;

          return (
            <tr key={type} className="@text-fg">
              <Td>
                <span className="@flex @items-center @gap-2 @whitespace-nowrap @font-medium">
                  <UnitSprite unitType={type} />
                  {t.units[type]}
                </span>
              </Td>
              <Td className="@text-right @tabular-nums">{properties.cost}</Td>
              <Td className="@text-right @tabular-nums">{properties.movementPoints}</Td>
              <Td className="@text-right @tabular-nums">
                {range === undefined
                  ? labels.none
                  : range[0] === range[1]
                    ? range[0]
                    : `${range[0]}–${range[1]}`}
              </Td>
              <Td className="@text-right @tabular-nums">{properties.vision}</Td>
              <Td className="@text-right @tabular-nums">{properties.initialFuel}</Td>
              <Td className="@text-right @tabular-nums">
                {"initialAmmo" in properties ? properties.initialAmmo : labels.none}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

const plain: Tile = { type: "plain", variant: "normal" };

const terrainRows: { tile: Tile }[] = [
  { tile: plain },
  { tile: { type: "road", variant: "right-left" } },
  { tile: { type: "bridge", variant: "right-left" } },
  { tile: { type: "river", variant: "right-left" } },
  { tile: { type: "forest" } },
  { tile: { type: "mountain" } },
  { tile: { type: "sea" } },
  { tile: { type: "shoal" } },
  { tile: { type: "reef" } },
  { tile: { type: "city", playerSlot: -1 } },
  { tile: { type: "base", playerSlot: -1 } },
  { tile: { type: "airport", playerSlot: -1 } },
  { tile: { type: "port", playerSlot: -1 } },
  { tile: { type: "hq", playerSlot: 0 } },
  { tile: { type: "lab", playerSlot: -1 } },
  { tile: { type: "commtower", playerSlot: -1 } },
];

const movementColumns = ["foot", "boots", "treads", "tires", "air", "sea", "lander"] as const;

function TerrainTable() {
  const t = useT();
  const labels = t.guide.terrain;

  return (
    <Table>
      <thead>
        <tr>
          <Th>{labels.name}</Th>
          <Th>{labels.stars}</Th>
          {movementColumns.map((column) => (
            <Th key={column} className="@text-right">
              {labels[column]}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {terrainRows.map(({ tile }) => {
          const type = tile.type as keyof typeof labels.names;
          const { defenseStars, movementCosts } = terrainProperties[tile.type];

          return (
            <tr key={tile.type} className="@text-fg">
              <Td>
                <span className="@flex @items-center @gap-2 @whitespace-nowrap @font-medium">
                  <span className="@w-6 @shrink-0">
                    <MapCanvas tiles={[[tile]]} />
                  </span>
                  {labels.names[type]}
                </span>
              </Td>
              <Td>
                <span className="@flex @gap-0.5" aria-label={String(defenseStars)}>
                  {Array.from({ length: defenseStars }, (_, index) => (
                    <Star key={index} className="@h-3 @w-3 @fill-accent @text-accent" aria-hidden />
                  ))}
                  {defenseStars === 0 && labels.none}
                </span>
              </Td>
              {movementColumns.map((column) => (
                <Td key={column} className="@text-right @tabular-nums">
                  {movementCosts[column] ?? labels.none}
                </Td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function DamageExplorer() {
  const t = useT();
  const labels = t.guide.combat;
  const [attacker, setAttacker] = useState<UnitType>("tank");
  const weapons = damageChartAW2[attacker];

  const targets = unitTypes
    .map((target) => ({
      target,
      // units use their primary weapon as long as they have ammo
      damage: weapons?.primary?.[target] ?? weapons?.secondary?.[target],
    }))
    .filter((entry): entry is { target: UnitType; damage: number } => entry.damage !== undefined)
    .sort((a, b) => b.damage - a.damage);

  return (
    <Card className="@p-4">
      <h3 className="@text-xl @leading-tight @text-fg">{labels.explorerTitle}</h3>
      <p className="@mb-3 @mt-1 @text-sm">{labels.explorerIntro}</p>
      <Select<UnitType>
        label={labels.attacker}
        className="@mb-4 @max-w-xs"
        value={attacker}
        onChange={setAttacker}
        options={unitTypes.map((type) => ({ value: type, label: t.units[type] }))}
      />
      {targets.length === 0 ? (
        <p>{labels.cantAttack}</p>
      ) : (
        <ul className="@grid @gap-x-6 @gap-y-1.5 smallscreen:@grid-cols-2">
          {targets.map(({ target, damage }) => (
            <li key={target} className="@flex @items-center @gap-2 @text-fg">
              <UnitSprite unitType={target} army="blue-moon" className="@h-5 @w-5 @shrink-0" />
              <span className="@w-24 @shrink-0 @truncate @text-xs">{t.units[target]}</span>
              <span className="@h-2 @flex-1 @bg-overlay">
                <span
                  className="@block @h-full @bg-accent"
                  style={{ width: `${Math.min(damage, 100)}%` }}
                />
              </span>
              <span className="@w-9 @shrink-0 @text-right @text-xs @tabular-nums">{damage} %</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function COCard({ co }: { co: (typeof aw2COs)[number] }) {
  const t = useT();
  const labels = t.guide.cos;
  const { dayToDay, powers } = getCOProperties({ name: co, version: "AW2" });
  const texts = labels.texts[co];

  const powerRows = [
    { label: labels.power, power: powers.COPower, text: texts?.power },
    { label: labels.superPower, power: powers.superCOPower, text: texts?.superPower },
  ];

  return (
    <Card className="@flex @flex-col @gap-2 @p-3 @text-fg">
      <div className="@flex @items-center @gap-3">
        <COPortrait co={co} className="@h-12 @w-12" />
        <h3 className="@text-2xl @leading-none">{coDisplayName(co)}</h3>
      </div>
      <p className="@text-xs @text-fg-muted">
        <span className="@font-semibold @text-fg">
          {labels.dayToDay}
          {t.common.colon}
        </span>
        {texts?.dayToDay ?? dayToDay?.description ?? labels.noDayToDay}
      </p>
      {powerRows.map(
        ({ label, power, text }) =>
          power !== undefined && (
            <p key={label} className="@text-xs @text-fg-muted">
              <span className="@font-semibold @text-accent-hover">
                {label} · {power.name} ({labels.stars(power.stars)}){t.common.colon}
              </span>
              {text ?? power.description}
            </p>
          ),
      )}
    </Card>
  );
}

export default function HowToPlayPage() {
  const t = useT();
  const { guide } = t;

  return (
    <Page title={guide.title}>
      <PageHeader title={guide.title} description={guide.description} />

      <div className="@grid @items-start @gap-8 laptop:@grid-cols-[12rem_minmax(0,1fr)]">
        <nav
          aria-label={guide.contents}
          className="@top-20 @hidden @flex-col @gap-1 @text-sm laptop:@sticky laptop:@flex"
        >
          <p className="@mb-1 @text-xs @font-semibold @uppercase @tracking-wide @text-fg-subtle">
            {guide.contents}
          </p>
          {sectionIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="@border-l-2 @border-line @py-1 @pl-3 @text-fg-muted @transition-colors hover:@border-accent hover:@text-fg"
            >
              {guide.sections[id]}
            </a>
          ))}
        </nav>

        <div className="@min-w-0">
          <Section id="objective">
            <p>{guide.objective.intro}</p>
            <BulletList items={guide.objective.conditions} />
            <p>{guide.objective.crash}</p>
          </Section>

          <Section id="turn">
            <p>{guide.turn.intro}</p>
            <BulletList items={guide.turn.start} />
            <p>{guide.turn.during}</p>
          </Section>

          <Section id="units">
            <p>{guide.units.intro}</p>
            <InfoCards items={guide.units.roles} />
            <Tabs
              items={[
                {
                  key: "base",
                  label: guide.units.tabLand,
                  content: <UnitsTable facility="base" />,
                },
                {
                  key: "airport",
                  label: guide.units.tabAir,
                  content: <UnitsTable facility="airport" />,
                },
                { key: "port", label: guide.units.tabSea, content: <UnitsTable facility="port" /> },
              ]}
            />
          </Section>

          <Section id="terrain">
            <p>{guide.terrain.intro}</p>
            <TerrainTable />
          </Section>

          <Section id="combat">
            <p>{guide.combat.intro}</p>
            <InfoCards items={guide.combat.factors} />
            <p>{guide.combat.counter}</p>
            <DamageExplorer />
            <div>
              <h3 className="@text-xl @text-fg">{guide.combat.formulaTitle}</h3>
              <code className="@mt-1 @block @overflow-x-auto @border @border-line @bg-surface @p-3 @text-xs @text-fg">
                {guide.combat.formula}
              </code>
            </div>
          </Section>

          <Section id="economy">
            <InfoCards
              items={[
                guide.economy.capture,
                guide.economy.income,
                guide.economy.repair,
                guide.economy.fuel,
              ]}
            />
          </Section>

          <Section id="cos">
            <p>{guide.cos.intro}</p>
            <div className="@grid @gap-3 smallscreen:@grid-cols-2">
              {aw2COs.map((co) => (
                <COCard key={co} co={co} />
              ))}
            </div>
          </Section>

          <Section id="weather">
            <p>{guide.weather.intro}</p>
            <InfoCards items={[guide.weather.rain, guide.weather.snow]} />
          </Section>

          <Section id="controls">
            <ul className="@flex @flex-col @gap-1.5">
              {guide.controls.items.map(({ action, result }) => (
                <li key={action}>
                  <span className="@font-semibold @text-fg">{action}</span> {result}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </Page>
  );
}
