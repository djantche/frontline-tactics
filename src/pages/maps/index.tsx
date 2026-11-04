import type { inferRouterOutputs } from "@trpc/server";
import { useAuthDialog } from "frontend/components/auth/useAuthDialog";
import { CreateRoomDialog } from "frontend/components/rooms/CreateRoomDialog";
import { usePlayers } from "frontend/context/players";
import { Button, ButtonLink } from "frontend/ui/Button";
import { Card } from "frontend/ui/Card";
import { Dialog } from "frontend/ui/Dialog";
import { EmptyState } from "frontend/ui/EmptyState";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Page, PageHeader } from "frontend/ui/Page";
import { Skeleton } from "frontend/ui/Skeleton";
import { Tabs } from "frontend/ui/Tabs";
import { useToast } from "frontend/ui/Toast";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { Copy, Map as MapIcon, Pencil, Plus, Swords, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import type { AppRouter } from "server/routers/app";

type WarsMap = inferRouterOutputs<AppRouter>["map"]["getAll"][number];

export default function MapsPage() {
  const t = useT();
  const toast = useToast();
  const utils = trpc.useUtils();
  const { status } = useSession();
  const { open: openAuthDialog } = useAuthDialog();
  const { currentPlayer } = usePlayers();
  const labels = t.maps;

  const { data: maps } = trpc.map.getAll.useQuery();
  const deleteMap = trpc.map.delete.useMutation();

  const [roomMapId, setRoomMapId] = useState<string>();
  const [mapToDelete, setMapToDelete] = useState<WarsMap>();

  const isAuthenticated = status === "authenticated";

  const onDelete = () => {
    if (mapToDelete === undefined || currentPlayer === undefined) {
      return;
    }

    deleteMap.mutate(
      { mapId: mapToDelete.id, playerId: currentPlayer.id },
      {
        onSuccess: () => {
          void utils.map.invalidate();
          toast(labels.deleted, "success");
          setMapToDelete(undefined);
        },
        onError: () => toast(labels.deleteFailed, "error"),
      },
    );
  };

  const mapCard = (map: WarsMap) => {
    const isMine = map.authorId !== null && map.authorId === currentPlayer?.userId;
    const canEdit = isMine && !map.isUsedByMatch;

    return (
      <Card key={map.id} className="@flex @flex-col">
        <div className="@flex @h-44 @items-center @justify-center @overflow-hidden @border-b @border-line @bg-canvas @p-2">
          <MapCanvas tiles={map.tiles} label={map.name} className="!@h-full !@w-auto @max-w-full" />
        </div>
        <div className="@flex @flex-1 @flex-col @gap-2 @p-3">
          <div>
            <h2 className="@truncate @text-xl @leading-tight">{map.name}</h2>
            <p className="@truncate @text-xs @text-fg-muted">
              {labels.details(
                map.size.width,
                map.size.height,
                map.authorName ?? labels.officialAuthor,
              )}
            </p>
          </div>
          <div className="@mt-auto @flex @flex-wrap @gap-1.5">
            {map.numberOfPlayers === 2 && (
              <Button
                size="sm"
                icon={<Swords className="@h-3.5 @w-3.5" aria-hidden />}
                onClick={() => {
                  if (isAuthenticated) {
                    setRoomMapId(map.id);
                  } else {
                    openAuthDialog();
                  }
                }}
              >
                {labels.play}
              </Button>
            )}
            {isAuthenticated && (
              <ButtonLink
                href={`/maps/${map.id}/edit`}
                size="sm"
                variant="secondary"
                icon={
                  canEdit ? (
                    <Pencil className="@h-3.5 @w-3.5" aria-hidden />
                  ) : (
                    <Copy className="@h-3.5 @w-3.5" aria-hidden />
                  )
                }
              >
                {canEdit ? labels.edit : labels.duplicate}
              </ButtonLink>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={labels.delete(map.name)}
                icon={<Trash2 className="@h-3.5 @w-3.5" aria-hidden />}
                onClick={() => setMapToDelete(map)}
              />
            )}
          </div>
        </div>
      </Card>
    );
  };

  const mapGrid = (items: WarsMap[] | undefined, emptyAction: boolean) => {
    if (items === undefined) {
      return (
        <div className="@grid @gap-4 smallscreen:@grid-cols-2 laptop:@grid-cols-3">
          <Skeleton className="@h-72" />
          <Skeleton className="@h-72" />
          <Skeleton className="@h-72" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={<MapIcon className="@h-8 @w-8" aria-hidden />}
          title={labels.emptyTitle}
          text={labels.emptyText}
          action={
            emptyAction ? <ButtonLink href="/maps/new">{labels.create}</ButtonLink> : undefined
          }
        />
      );
    }

    return (
      <div className="@grid @gap-4 smallscreen:@grid-cols-2 laptop:@grid-cols-3 desktop:@grid-cols-4">
        {items.map(mapCard)}
      </div>
    );
  };

  const myMaps = maps?.filter(
    (map) => map.authorId !== null && map.authorId === currentPlayer?.userId,
  );

  return (
    <Page title={labels.title} wide>
      <PageHeader
        title={labels.title}
        description={labels.description}
        actions={
          isAuthenticated ? (
            <ButtonLink href="/maps/new" icon={<Plus className="@h-4 @w-4" aria-hidden />}>
              {labels.create}
            </ButtonLink>
          ) : (
            <Button
              icon={<Plus className="@h-4 @w-4" aria-hidden />}
              onClick={() => openAuthDialog()}
            >
              {labels.create}
            </Button>
          )
        }
      />

      <Tabs
        items={[
          { key: "all", label: labels.tabAll, count: maps?.length, content: mapGrid(maps, false) },
          ...(isAuthenticated
            ? [
                {
                  key: "mine",
                  label: labels.tabMine,
                  count: myMaps?.length,
                  content: mapGrid(myMaps, true),
                },
              ]
            : []),
        ]}
      />

      {roomMapId !== undefined && (
        <CreateRoomDialog open onClose={() => setRoomMapId(undefined)} mapId={roomMapId} />
      )}

      <Dialog
        open={mapToDelete !== undefined}
        onClose={() => setMapToDelete(undefined)}
        size="sm"
        title={labels.deleteTitle}
        description={labels.deleteText(mapToDelete?.name ?? "")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMapToDelete(undefined)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" loading={deleteMap.isLoading} onClick={onDelete}>
              {labels.confirmDelete}
            </Button>
          </>
        }
      >
        <p className="@text-sm @text-fg-muted">{labels.deleteWarning}</p>
      </Dialog>
    </Page>
  );
}
