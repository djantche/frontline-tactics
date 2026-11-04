"use client"; // This is a client component 👈🏽
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import { AppShell } from "frontend/components/shell/AppShell";
import { ProvidePlayers } from "frontend/context/players";
import "frontend/styles/global.css";
import { trpc } from "frontend/utils/trpc-client";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppType } from "next/app";
import Head from "next/head";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>Frontline Tactics</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
      </Head>
      <ProvidePlayers>
        <AppShell>
          <Component {...pageProps} />
        </AppShell>
      </ProvidePlayers>
    </SessionProvider>
  );
};

export default trpc.withTRPC(MyApp);
