import Head from "next/head";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** Centered page column, with the browser title. */
export function Page({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Head>
        <title>{`${title} | Wars World`}</title>
      </Head>
      <div
        className={cx(
          "@mx-auto @w-full @px-4 @py-6 smallscreen:@px-6 smallscreen:@py-8",
          wide === true ? "@max-w-[96rem]" : "@max-w-6xl",
        )}
      >
        {children}
      </div>
    </>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="@mb-6 @flex @flex-wrap @items-end @justify-between @gap-4">
      <div>
        <h1 className="@text-4xl @leading-none">{title}</h1>
        {description !== undefined && (
          <p className="@mt-2 @max-w-2xl @text-sm @text-fg-muted">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="@flex @items-center @gap-2">{actions}</div>}
    </header>
  );
}
