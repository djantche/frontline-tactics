/**
 * The email domain marks a user as a seeded dev account (see prisma/devUsers.ts).
 * The one-click dev login only ever accepts users with such an email.
 */
export const devAccountEmailDomain = "@dev.local";

export const isDevAccountEmail = (email: string | null | undefined) =>
  email?.endsWith(devAccountEmailDomain) ?? false;
