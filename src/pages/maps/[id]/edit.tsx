import { ProtectPage } from "frontend/components/auth/ProtectPage";
import { MapEditor } from "frontend/components/maps/MapEditor";
import { usePlayers } from "frontend/context/players";
import { ButtonLink } from "frontend/ui/Button";
import { EmptyState } from "frontend/ui/EmptyState";
import { Page } from "frontend/ui/Page";
import { Skeleton } from "frontend/ui/Skeleton";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import Head from "next/head";
import { useRouter } from "next/router";

export default function EditMapPage() {
  const t = useT();
  const { query } = useRouter();
  const { currentPlayer } = usePlayers();
  const { data: maps } = trpc.map.getAll.useQuery(undefined, {
    // the editor owns the tiles from here on, refetches must not reset it
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  const map = maps?.find(({ id }) => id === query.id);

  if (maps === undefined || currentPlayer === undefined) {
    return (
      <ProtectPage>
        <Skeleton className="@m-6 @h-96" />
      </ProtectPage>
    );
  }

  if (map === undefined) {
    return (
      <ProtectPage>
        <Page title={t.mapEditor.notFound}>
          <EmptyState
            title={t.mapEditor.notFound}
            action={<ButtonLink href="/maps">{t.mapEditor.back}</ButtonLink>}
          />
        </Page>
      </ProtectPage>
    );
  }

  const isCopy = map.isUsedByMatch || map.authorId !== currentPlayer.userId;

  return (
    <ProtectPage>
      <Head>
        <title>{`${map.name} | Frontline Tactics`}</title>
      </Head>
      <MapEditor
        key={map.id}
        mapId={map.id}
        initialName={isCopy ? t.mapEditor.copyName(map.name) : map.name}
        initialTiles={map.tiles}
        isCopy={isCopy}
      />
    </ProtectPage>
  );
}
