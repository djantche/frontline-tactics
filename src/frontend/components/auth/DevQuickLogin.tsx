import { Badge } from "frontend/ui/Badge";
import { useT } from "i18n";
import { signIn } from "next-auth/react";
import type { DevAccount } from "pages/api/dev/accounts";
import { useEffect, useState } from "react";

type Props = {
  onSuccess: () => void;
};

/** One-click login as a seeded dev account. Only rendered when the `dev-login` provider exists. */
export default function DevQuickLogin({ onSuccess }: Props) {
  const t = useT();
  const [accounts, setAccounts] = useState<DevAccount[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void fetch("/api/dev/accounts")
      .then((response) => response.json() as Promise<DevAccount[]>)
      .then(setAccounts)
      .catch(() => setError(t.auth.devLoadFailed));
  }, [t.auth.devLoadFailed]);

  const loginAs = async (userId: string) => {
    const response = await signIn("dev-login", { userId, redirect: false });

    if (response?.ok === true) {
      onSuccess();
    } else {
      setError(t.auth.devLoginFailed);
    }
  };

  return (
    <section className="@border @border-dashed @border-warning @bg-warning-soft @p-3">
      <h3 className="@text-lg @leading-tight @text-warning">{t.auth.devTitle}</h3>
      <p className="@mb-2 @text-xs @text-fg-muted">{t.auth.devHint}</p>
      {error !== undefined && (
        <p role="alert" className="@mb-2 @text-sm @text-danger">
          {error}
        </p>
      )}
      <div className="@grid @grid-cols-1 @gap-1.5 tablet:@grid-cols-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            className="@flex @items-center @justify-between @gap-2 @border @border-line-strong @bg-raised @px-3 @py-2 @text-left @transition-colors hover:@bg-overlay"
            onClick={() => void loginAs(account.id)}
          >
            <span className="@min-w-0">
              <span className="@block @truncate @text-sm @font-semibold">{account.name}</span>
              <span className="@block @truncate @text-xs @text-fg-muted">
                {account.players.join(", ")}
              </span>
            </span>
            {account.role !== null && <Badge tone="accent">{account.role}</Badge>}
          </button>
        ))}
      </div>
    </section>
  );
}
