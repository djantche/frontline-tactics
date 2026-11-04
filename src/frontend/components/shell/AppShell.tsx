import { Menu as MenuIcon, Settings, X } from "lucide-react";
import { cx } from "frontend/ui/cx";
import { ToastProvider } from "frontend/ui/Toast";
import { useT } from "i18n";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AuthDialog } from "../auth/AuthDialog";
import { AccountMenu } from "./AccountMenu";

function Logo() {
  return (
    <Link
      href="/"
      className="@flex @items-center @gap-2 @font-display @text-xl @font-bold @uppercase @tracking-wide"
    >
      <span className="@flex @h-6 @w-6 @items-center @justify-center @bg-accent" aria-hidden>
        <span className="@h-2.5 @w-2.5 @bg-accent-fg" />
      </span>
      Frontline Tactics
    </Link>
  );
}

function Header() {
  const t = useT();
  const { pathname, asPath } = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [asPath]);

  const links = [
    { href: "/", label: t.nav.rooms },
    { href: "/maps", label: t.nav.maps },
    { href: "/how-to-play", label: t.nav.guide },
    { href: "/leaderboard", label: t.nav.leaderboard },
  ];

  const linkClass = (href: string) =>
    cx(
      "@flex @items-center @text-sm @font-medium @transition-colors",
      pathname === href ? "@text-fg" : "@text-fg-muted hover:@text-fg",
    );

  return (
    <header className="@sticky @top-0 @z-40 @border-b @border-line @bg-surface">
      <div className="@mx-auto @flex @h-14 @max-w-[96rem] @items-center @gap-6 @px-4 smallscreen:@px-6">
        <Logo />
        <nav className="@hidden @h-full @gap-5 smallscreen:@flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cx(
                linkClass(href),
                "@border-b-2",
                pathname === href ? "@border-accent" : "@border-transparent",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="@ml-auto @flex @items-center @gap-2">
          <Link
            href="/settings"
            aria-label={t.nav.settings}
            title={t.nav.settings}
            className="@flex @h-8 @w-8 @items-center @justify-center @text-fg-muted hover:@text-fg"
          >
            <Settings className="@h-4 @w-4" aria-hidden />
          </Link>
          <AccountMenu />
          <button
            type="button"
            aria-label={isMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={isMenuOpen}
            className="@flex @h-8 @w-8 @items-center @justify-center @text-fg-muted hover:@text-fg smallscreen:@hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="@h-5 @w-5" /> : <MenuIcon className="@h-5 @w-5" />}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <nav className="@flex @flex-col @border-t @border-line smallscreen:@hidden">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className={cx(linkClass(href), "@px-4 @py-3")}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const t = useT();

  return (
    <footer className="@border-t @border-line @px-4 @py-4 @text-xs @text-fg-subtle smallscreen:@px-6">
      <div className="@mx-auto @flex @max-w-[96rem] @flex-wrap @items-center @justify-between @gap-x-6 @gap-y-1">
        <p>{t.footer.copyright}</p>
        <p className="@flex @gap-4">
          <a
            href="https://github.com/WarsWorld/WarsWorld"
            target="_blank"
            rel="noreferrer"
            className="hover:@text-fg"
          >
            {t.footer.basedOn}
          </a>
          <a
            href="https://github.com/Robosturm/Commander_Wars"
            target="_blank"
            rel="noreferrer"
            className="hover:@text-fg"
          >
            {t.footer.assetsFrom}
          </a>
          <a
            href="https://github.com/djantche/frontline-tactics"
            target="_blank"
            rel="noreferrer"
            className="hover:@text-fg"
          >
            {t.footer.sourceCode}
          </a>
        </p>
      </div>
    </footer>
  );
}

/** The frame of every page. A match gets the whole screen, the map editor all but the footer. */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  const isGame = pathname.startsWith("/game");
  const isEditor = pathname === "/maps/new" || pathname === "/maps/[id]/edit";

  return (
    <ToastProvider>
      <div className={cx("@flex @flex-col", isEditor ? "@h-screen" : "@min-h-screen")}>
        {!isGame && <Header />}
        <main className="@flex @min-h-0 @flex-1 @flex-col">{children}</main>
        {!isGame && !isEditor && <Footer />}
      </div>
      <AuthDialog />
    </ToastProvider>
  );
}
