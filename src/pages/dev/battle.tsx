import { BattleScene } from "frontend/components/game/BattleScene";
import type { BattleView } from "frontend/game/battle-timeline";
import { Button } from "frontend/ui/Button";
import { Page, PageHeader } from "frontend/ui/Page";
import { Select } from "frontend/ui/Select";
import { TextField } from "frontend/ui/TextField";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { UnitType } from "shared/schemas/unit";
import { unitTypes } from "shared/schemas/unit";

/** Plays any fight, to check the animations of every unit. Only available with `next dev`. */
export const getServerSideProps: GetServerSideProps = () =>
  Promise.resolve(
    process.env.NODE_ENV === "development" ? { props: {} } : { notFound: true as const },
  );

const unitOptions = unitTypes.map((value) => ({ value, label: value }));
const terrains = ["planes", "forest", "mountain", "street", "town", "sea", "beach", "airport"];
const terrainOptions = terrains.map((value) => ({ value, label: value }));

export default function DevBattlePage() {
  const { query } = useRouter();
  const [attackerType, setAttackerType] = useState<UnitType>("tank");
  const [defenderType, setDefenderType] = useState<UnitType>("infantry");

  // /dev/battle?attacker=sub&defender=lander picks the units from the URL
  useEffect(() => {
    if (typeof query.attacker === "string") {
      setAttackerType(query.attacker as UnitType);
    }

    if (typeof query.defender === "string") {
      setDefenderType(query.defender as UnitType);
    }
  }, [query.attacker, query.defender]);

  const [attackerTerrain, setAttackerTerrain] = useState("street");
  const [defenderTerrain, setDefenderTerrain] = useState("planes");
  const [defenderHpAfter, setDefenderHpAfter] = useState("30");
  const [attackerHpAfter, setAttackerHpAfter] = useState("80");
  const [view, setView] = useState<BattleView>();

  const play = () =>
    setView({
      attacker: {
        unitType: attackerType,
        army: "orange-star",
        co: "andy",
        hpBefore: 100,
        hpAfter: Number(attackerHpAfter),
        terrain: attackerTerrain,
        stars: 0,
      },
      defender: {
        unitType: defenderType,
        army: "blue-moon",
        co: "sami",
        hpBefore: 100,
        hpAfter: Number(defenderHpAfter),
        terrain: defenderTerrain,
        stars: 1,
      },
    });

  return (
    <Page title="Battle">
      <PageHeader title="Scène de combat" description="Pour tester toutes les unités." />
      <div className="@grid @max-w-2xl @gap-4 tablet:@grid-cols-2">
        <Select
          label="Attaquant"
          value={attackerType}
          onChange={setAttackerType}
          options={unitOptions}
        />
        <Select
          label="Défenseur"
          value={defenderType}
          onChange={setDefenderType}
          options={unitOptions}
        />
        <Select
          label="Terrain attaquant"
          value={attackerTerrain}
          onChange={setAttackerTerrain}
          options={terrainOptions}
        />
        <Select
          label="Terrain défenseur"
          value={defenderTerrain}
          onChange={setDefenderTerrain}
          options={terrainOptions}
        />
        <TextField
          label="PV attaquant après"
          value={attackerHpAfter}
          onChange={(event) => setAttackerHpAfter(event.target.value)}
        />
        <TextField
          label="PV défenseur après"
          value={defenderHpAfter}
          onChange={(event) => setDefenderHpAfter(event.target.value)}
        />
      </div>
      <Button className="@mt-4" onClick={play}>
        Lancer le combat
      </Button>
      {view !== undefined && <BattleScene view={view} onEnd={() => setView(undefined)} />}
    </Page>
  );
}
