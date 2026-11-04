import { Menu } from "@headlessui/react";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { usePlayers } from "frontend/context/players";
import { Button } from "frontend/ui/Button";
import { cx } from "frontend/ui/cx";
import { useLocale, useT } from "i18n";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useAuthDialog } from "../auth/useAuthDialog";

const itemClass = (active: boolean) =>
  cx(
    "@flex @w-full @items-center @gap-2 @px-3 @py-2 @text-left @text-sm",
    active ? "@bg-line-strong @text-fg" : "@text-fg-muted",
  );

export function AccountMenu() {
  const t = useT();
  const locale = useLocale();
  const { status, data: session } = useSession();
  const { clearLSCurrentPlayer, currentPlayer } = usePlayers();
  const { open } = useAuthDialog();

  if (status === "loading") {
    return <div className="@h-8 @w-24" />;
  }

  if (status === "unauthenticated") {
    return (
      <Button size="sm" onClick={() => open()}>
        {t.account.login}
      </Button>
    );
  }

  const logOut = () => {
    clearLSCurrentPlayer();
    void signOut({ callbackUrl: locale === "fr" ? "/" : `/${locale}` });
  };

  return (
    <Menu as="div" className="@relative">
      <Menu.Button
        aria-label={t.account.menu}
        className="@flex @h-8 @max-w-[11rem] @items-center @gap-1.5 @border @border-line-strong @bg-raised @px-2.5 @text-sm @font-medium @transition-colors hover:@bg-overlay"
      >
        <span className="@truncate">{currentPlayer?.displayName ?? session?.user?.name}</span>
        <ChevronDown className="@h-3.5 @w-3.5 @shrink-0 @text-fg-muted" aria-hidden />
      </Menu.Button>
      <Menu.Items className="@absolute @right-0 @z-30 @mt-1 @w-48 @border @border-line-strong @bg-overlay @py-1 @shadow-xl @shadow-black/40 focus:@outline-none">
        {currentPlayer !== undefined && (
          <Menu.Item>
            {({ active }) => (
              <Link
                href={`/players/${encodeURIComponent(currentPlayer.name)}`}
                className={itemClass(active)}
              >
                <UserRound className="@h-4 @w-4" aria-hidden />
                {t.account.profile}
              </Link>
            )}
          </Menu.Item>
        )}
        <Menu.Item>
          {({ active }) => (
            <Link href="/settings" className={itemClass(active)}>
              <Settings className="@h-4 @w-4" aria-hidden />
              {t.account.settings}
            </Link>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <button type="button" onClick={logOut} className={itemClass(active)}>
              <LogOut className="@h-4 @w-4" aria-hidden />
              {t.account.logout}
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
