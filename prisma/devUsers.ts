import type { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "server/hashPassword";
import { devAccountEmailDomain } from "shared/dev-accounts";

/** Accounts listed by the one-click dev login. */
const devAccountPassword = "secret";

const devAccounts: { name: string; role?: Role; playerNames: string[] }[] = [
  { name: "dev_admin", role: "admin", playerNames: ["[dev] Admin"] },
  { name: "dev_moderator", role: "moderator", playerNames: ["[dev] Moderator"] },
  { name: "dev_alice", playerNames: ["[dev] Alice"] },
  { name: "dev_bob", playerNames: ["[dev] Bob"] },
  { name: "dev_carol", playerNames: ["[dev] Carol", "[dev] Carol (alt)"] },
];

/** Safe to run repeatedly: existing dev accounts and players are updated, not duplicated. */
export async function seedDevAccounts(prisma: PrismaClient) {
  const password = await hashPassword(devAccountPassword);

  for (const { name, role, playerNames } of devAccounts) {
    const email = `${name}${devAccountEmailDomain}`;

    const { id: userId } = await prisma.user.upsert({
      where: { email },
      create: { name, email, role, password },
      update: { name, role, password },
    });

    for (const playerName of playerNames) {
      await prisma.player.upsert({
        where: { name: playerName },
        create: { name: playerName, displayName: playerName, userId },
        update: { userId },
      });
    }
  }
}
