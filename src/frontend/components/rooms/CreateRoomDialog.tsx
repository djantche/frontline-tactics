import { usePlayers } from "frontend/context/players";
import { Button } from "frontend/ui/Button";
import { cx } from "frontend/ui/cx";
import { Dialog } from "frontend/ui/Dialog";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Select } from "frontend/ui/Select";
import { TextField } from "frontend/ui/TextField";
import { useToast } from "frontend/ui/Toast";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { useRouter } from "next/router";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Preselected map. */
  mapId?: string;
};

const fundsOptions = ["1000", "2000", "3000", "4000", "5000"];

export function CreateRoomDialog({ open, onClose, mapId }: Props) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { currentPlayer } = usePlayers();
  const [name, setName] = useState("");
  const [pickedMapId, setPickedMapId] = useState(mapId);
  const [funds, setFunds] = useState("1000");

  const { data: allMaps } = trpc.map.getAll.useQuery(undefined, { enabled: open });
  const createRoom = trpc.match.create.useMutation();

  // maps made in the editor always have 2 players, some imported ones may not
  const maps = allMaps?.filter((map) => map.numberOfPlayers === 2);
  const selectedMapId = pickedMapId ?? maps?.[0]?.id;

  const onSubmit = () => {
    if (selectedMapId === undefined || currentPlayer === undefined) {
      return;
    }

    createRoom.mutate(
      {
        name: name.trim() === "" ? undefined : name,
        mapId: selectedMapId,
        playerId: currentPlayer.id,
        rules: {
          bannedUnitTypes: [],
          captureLimit: 50,
          dayLimit: 50,
          fogOfWar: false,
          fundsPerProperty: Number(funds),
          unitCapPerPlayer: 50,
          weatherSetting: "clear",
          labUnitTypes: [],
          teamMapping: [0, 1],
        },
      },
      {
        onSuccess: ({ id }) => void router.push(`/rooms/${id}`),
        onError: () => toast(t.createRoom.failed, "error"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t.createRoom.title}
      description={t.createRoom.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={onSubmit}
            loading={createRoom.isLoading}
            disabled={selectedMapId === undefined || currentPlayer === undefined}
          >
            {t.createRoom.submit}
          </Button>
        </>
      }
    >
      <div className="@flex @flex-col @gap-4">
        <div className="@grid @gap-4 smallscreen:@grid-cols-2">
          <TextField
            label={t.createRoom.name}
            placeholder={t.createRoom.namePlaceholder}
            hint={t.createRoom.nameHint}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select
            label={t.createRoom.funds}
            value={funds}
            onChange={setFunds}
            options={fundsOptions.map((value) => ({ value, label: value }))}
          />
        </div>
        <fieldset>
          <legend className="@mb-1.5 @text-sm @font-medium">{t.createRoom.map}</legend>
          {maps?.length === 0 && <p className="@text-sm @text-fg-muted">{t.createRoom.noMaps}</p>}
          <div className="@grid @max-h-80 @grid-cols-2 @gap-2 @overflow-y-auto smallscreen:@grid-cols-3">
            {maps?.map((map) => (
              <label
                key={map.id}
                className={cx(
                  "@flex @cursor-pointer @flex-col @border @bg-raised @transition-colors focus-within:@outline focus-within:@outline-2 focus-within:@outline-accent",
                  map.id === selectedMapId
                    ? "@border-accent"
                    : "@border-line hover:@border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="map"
                  className="@sr-only"
                  checked={map.id === selectedMapId}
                  onChange={() => setPickedMapId(map.id)}
                />
                <span className="@flex @h-28 @items-center @justify-center @overflow-hidden @bg-canvas @p-1">
                  <MapCanvas tiles={map.tiles} className="!@h-full !@w-auto @max-w-full" />
                </span>
                <span className="@flex @items-center @justify-between @gap-2 @px-2 @py-1.5 @text-xs">
                  <span className="@truncate @font-semibold">{map.name}</span>
                  <span className="@shrink-0 @text-fg-muted">
                    {t.createRoom.mapSize(map.size.width, map.size.height)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
