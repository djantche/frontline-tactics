import { Badge } from "frontend/ui/Badge";
import { Button } from "frontend/ui/Button";
import { Card } from "frontend/ui/Card";
import { COPortrait } from "frontend/ui/COPortrait";
import { Dialog } from "frontend/ui/Dialog";
import { EmptyState } from "frontend/ui/EmptyState";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Page, PageHeader } from "frontend/ui/Page";
import { Select } from "frontend/ui/Select";
import { Skeleton } from "frontend/ui/Skeleton";
import { Switch } from "frontend/ui/Switch";
import { Table, Td, Th } from "frontend/ui/Table";
import { Tabs } from "frontend/ui/Tabs";
import { TextField } from "frontend/ui/TextField";
import { useToast } from "frontend/ui/Toast";
import { Tooltip } from "frontend/ui/Tooltip";
import { Map, Plus, Swords } from "lucide-react";
import type { GetServerSideProps } from "next";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Tile } from "shared/schemas/tile";

/** A gallery of the design system, only available with `next dev`. */
export const getServerSideProps: GetServerSideProps = () =>
  Promise.resolve(
    process.env.NODE_ENV === "development" ? { props: {} } : { notFound: true as const },
  );

const plain: Tile = { type: "plain", variant: "normal" };
const road: Tile = { type: "road", variant: "right-left" };
const sea: Tile = { type: "sea" };
const forest: Tile = { type: "forest" };
const mountain: Tile = { type: "mountain" };

const demoMap: Tile[][] = [
  [{ type: "hq", playerSlot: 0 }, plain, forest, mountain, sea, sea],
  [{ type: "base", playerSlot: 0 }, road, road, road, { type: "city", playerSlot: -1 }, sea],
  [forest, plain, { type: "city", playerSlot: -1 }, road, road, { type: "base", playerSlot: 1 }],
  [sea, sea, mountain, forest, plain, { type: "hq", playerSlot: 1 }],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="@mb-8">
      <h2 className="@mb-3 @text-2xl @text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  const toast = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(true);
  const [selected, setSelected] = useState<string>("caustic");

  return (
    <Page title="UI">
      <PageHeader
        title="Design system"
        description="Composants de src/frontend/ui."
        actions={<Button icon={<Plus className="@h-4 @w-4" />}>Action</Button>}
      />

      <Section title="Boutons">
        <div className="@flex @flex-wrap @items-center @gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" icon={<Swords className="@h-4 @w-4" />}>
            Large
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Tooltip label="Une info-bulle">
            <Button variant="secondary">Tooltip</Button>
          </Tooltip>
          <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
            Dialog
          </Button>
          <Button variant="secondary" onClick={() => toast("Salon créé", "success")}>
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Connexion perdue", "error")}>
            Toast erreur
          </Button>
        </div>
      </Section>

      <Section title="Formulaires">
        <div className="@grid @max-w-3xl @gap-4 smallscreen:@grid-cols-2">
          <TextField label="Nom du salon" placeholder="Duel du soir" hint="60 caractères maximum" />
          <TextField label="Mot de passe" type="password" error="Mot de passe trop court" />
          <Select
            label="Carte"
            value={selected}
            onChange={setSelected}
            options={[
              { value: "caustic", label: "Caustic Finale" },
              { value: "bean", label: "Bean Island" },
            ]}
          />
          <Switch
            label="Brouillard"
            description="Une option à bascule"
            checked={isSwitchOn}
            onChange={setIsSwitchOn}
          />
        </div>
      </Section>

      <Section title="Badges">
        <div className="@flex @flex-wrap @gap-2">
          <Badge>Neutre</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success" dot>
            Prêt
          </Badge>
          <Badge tone="danger" dot>
            En cours
          </Badge>
          <Badge tone="warning">Attention</Badge>
          <Badge tone="info">Info</Badge>
        </div>
      </Section>

      <Section title="Carte, commandants et état vide">
        <div className="@grid @gap-4 smallscreen:@grid-cols-3">
          <Card interactive className="@p-3">
            <MapCanvas tiles={demoMap} label="Carte de démonstration" />
            <p className="@mt-2 @font-semibold">Carte de démonstration</p>
          </Card>
          <Card className="@flex @items-center @gap-3 @p-3">
            <COPortrait co="andy" alt="Andy" className="@h-16 @w-16" />
            <COPortrait co="sami" alt="Sami" className="@h-16 @w-16" />
            <COPortrait co={undefined} className="@h-16 @w-16" />
          </Card>
          <EmptyState
            icon={<Map className="@h-8 @w-8" />}
            title="Aucun salon"
            text="Créez le premier."
            action={<Button size="sm">Créer</Button>}
          />
        </div>
      </Section>

      <Section title="Onglets et tableau">
        <Tabs
          items={[
            {
              key: "units",
              label: "Unités",
              count: 2,
              content: (
                <Table>
                  <thead>
                    <tr>
                      <Th>Unité</Th>
                      <Th>Coût</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>Infanterie</Td>
                      <Td>1000</Td>
                    </tr>
                    <tr>
                      <Td>Tank</Td>
                      <Td>7000</Td>
                    </tr>
                  </tbody>
                </Table>
              ),
            },
            {
              key: "loading",
              label: "Chargement",
              content: <Skeleton className="@h-24 @w-full" />,
            },
          ]}
        />
      </Section>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Créer un salon"
        description="Un exemple de dialogue."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setIsDialogOpen(false)}>Créer</Button>
          </>
        }
      >
        <TextField label="Nom du salon" />
      </Dialog>
    </Page>
  );
}
