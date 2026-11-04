/**
 * Adds only the dev accounts, without touching the rest of the database.
 * Run with `npm run prisma:seed-dev-accounts`.
 */
import { PrismaClient } from "@prisma/client";
import { seedDevAccounts } from "./devUsers";

const prisma = new PrismaClient();

seedDevAccounts(prisma)
  .then(() => console.log("Dev accounts seeded"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
