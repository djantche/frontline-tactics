import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "server/prisma/prisma-client";
import { devAccountEmailDomain } from "shared/dev-accounts";

export type DevAccount = {
  id: string;
  name: string | null;
  role: string | null;
  players: string[];
};

/** Lists the seeded dev accounts for the one-click dev login. Only exists in `next dev`. */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).end();
    return;
  }

  const users = await prisma.user.findMany({
    where: { email: { endsWith: devAccountEmailDomain } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true, identities: { select: { displayName: true } } },
  });

  const accounts: DevAccount[] = users.map(({ id, name, role, identities }) => ({
    id,
    name,
    role,
    players: identities.map((player) => player.displayName),
  }));

  res.status(200).json(accounts);
}
