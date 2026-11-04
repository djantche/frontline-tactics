import { COPortrait } from "frontend/ui/COPortrait";
import { EmptyState } from "frontend/ui/EmptyState";
import { Page, PageHeader } from "frontend/ui/Page";
import { Skeleton } from "frontend/ui/Skeleton";
import { Table, Td, Th } from "frontend/ui/Table";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { Trophy } from "lucide-react";
import Link from "next/link";

export default function LeaderboardPage() {
  const t = useT();
  const labels = t.leaderboard;
  const { data: players, isError } = trpc.stats.leaderboard.useQuery();

  const content = () => {
    if (isError) {
      return <EmptyState title={labels.loadFailed} />;
    }

    if (players === undefined) {
      return <Skeleton className="@h-96 @w-full" />;
    }

    if (players.length === 0) {
      return (
        <EmptyState
          icon={<Trophy className="@h-8 @w-8" aria-hidden />}
          title={labels.emptyTitle}
          text={labels.emptyText}
        />
      );
    }

    return (
      <Table>
        <thead>
          <tr>
            <Th className="@w-12 @text-right">{labels.rank}</Th>
            <Th>{labels.player}</Th>
            <Th className="@text-right">{labels.games}</Th>
            <Th className="@text-right">{labels.wins}</Th>
            <Th className="@text-right">{labels.losses}</Th>
            <Th className="@text-right">{labels.draws}</Th>
            <Th className="@text-right">{labels.winRate}</Th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.id}>
              <Td className="@text-right @font-display @text-lg @font-semibold @tabular-nums">
                {index === 0 ? <span className="@text-accent">{index + 1}</span> : index + 1}
              </Td>
              <Td>
                <Link
                  href={`/players/${encodeURIComponent(player.name)}`}
                  className="@flex @items-center @gap-2 @font-medium hover:@text-accent-hover"
                >
                  <COPortrait co={player.cos[0]?.co} className="@h-7 @w-7" />
                  {player.name}
                </Link>
              </Td>
              <Td className="@text-right @tabular-nums">{player.games}</Td>
              <Td className="@text-right @tabular-nums">{player.wins}</Td>
              <Td className="@text-right @tabular-nums">{player.losses}</Td>
              <Td className="@text-right @tabular-nums">{player.draws}</Td>
              <Td className="@text-right @tabular-nums">{player.winRate} %</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <Page title={labels.title}>
      <PageHeader title={labels.title} description={labels.description} />
      {content()}
    </Page>
  );
}
