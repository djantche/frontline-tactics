import { coDisplayName } from "frontend/game/aw2-cos";
import { Badge } from "frontend/ui/Badge";
import type { BadgeTone } from "frontend/ui/Badge";
import { ButtonLink } from "frontend/ui/Button";
import { Card } from "frontend/ui/Card";
import { COPortrait } from "frontend/ui/COPortrait";
import { EmptyState } from "frontend/ui/EmptyState";
import { Page, PageHeader } from "frontend/ui/Page";
import { Skeleton } from "frontend/ui/Skeleton";
import { Table, Td, Th } from "frontend/ui/Table";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { UserRoundX } from "lucide-react";
import { useRouter } from "next/router";
import type { MatchResult } from "server/tools/player-stats";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="@p-3">
      <p className="@text-xs @font-medium @uppercase @tracking-wide @text-fg-muted">{label}</p>
      <p className="@mt-1 @font-display @text-3xl @font-semibold @tabular-nums">{value}</p>
    </Card>
  );
}

function Profile({ name }: { name: string }) {
  const t = useT();
  const labels = t.profile;
  const { data: player, isError } = trpc.stats.player.useQuery({ name }, { retry: false });

  const resultBadges: Record<MatchResult, { label: string; tone: BadgeTone }> = {
    win: { label: labels.win, tone: "success" },
    loss: { label: labels.loss, tone: "danger" },
    draw: { label: labels.draw, tone: "neutral" },
  };

  if (isError) {
    return (
      <EmptyState
        icon={<UserRoundX className="@h-8 @w-8" aria-hidden />}
        title={labels.notFound}
        action={<ButtonLink href="/leaderboard">{labels.backToLeaderboard}</ButtonLink>}
      />
    );
  }

  if (player === undefined) {
    return <Skeleton className="@h-96 @w-full" />;
  }

  const { stats, history, rank } = player;

  return (
    <>
      <PageHeader
        title={player.displayName}
        description={rank === null ? labels.unranked : labels.ranked(rank)}
      />

      {stats === null ? (
        <EmptyState title={labels.noGamesTitle} text={labels.noGamesText} />
      ) : (
        <div className="@flex @flex-col @gap-6">
          <div className="@grid @grid-cols-2 @gap-3 smallscreen:@grid-cols-5">
            <Stat label={labels.games} value={stats.games} />
            <Stat label={labels.wins} value={stats.wins} />
            <Stat label={labels.losses} value={stats.losses} />
            <Stat label={labels.draws} value={stats.draws} />
            <Stat label={labels.winRate} value={`${stats.winRate} %`} />
          </div>

          <section>
            <h2 className="@mb-2 @text-2xl">{labels.favoriteCos}</h2>
            <div className="@flex @flex-wrap @gap-2">
              {stats.cos.map(({ co, games }) => (
                <Card key={co} className="@flex @items-center @gap-2 @p-2 @pr-3">
                  <COPortrait co={co} className="@h-9 @w-9" />
                  <div>
                    <p className="@text-sm @font-semibold">{coDisplayName(co)}</p>
                    <p className="@text-xs @text-fg-muted">{labels.coGames(games)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="@mb-2 @text-2xl">{labels.history}</h2>
            <Table>
              <thead>
                <tr>
                  <Th>{labels.result}</Th>
                  <Th>{labels.opponent}</Th>
                  <Th>{labels.map}</Th>
                  <Th>{labels.co}</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((match) => (
                  <tr key={match.id}>
                    <Td>
                      <Badge tone={resultBadges[match.result].tone}>
                        {resultBadges[match.result].label}
                      </Badge>
                    </Td>
                    <Td>{match.opponents.join(", ")}</Td>
                    <Td className="@text-fg-muted">{match.name ?? match.mapName}</Td>
                    <Td className="@text-fg-muted">
                      {match.co === undefined ? "" : coDisplayName(match.co)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        </div>
      )}
    </>
  );
}

export default function PlayerPage() {
  const t = useT();
  const { query } = useRouter();
  const name = typeof query.playerName === "string" ? query.playerName : undefined;

  return (
    <Page title={name ?? t.profile.title}>
      {name === undefined ? <Skeleton className="@h-96 @w-full" /> : <Profile name={name} />}
    </Page>
  );
}
