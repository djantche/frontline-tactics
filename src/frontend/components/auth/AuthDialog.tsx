import { Button } from "frontend/ui/Button";
import { Dialog } from "frontend/ui/Dialog";
import { useT } from "i18n";
import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import DevQuickLogin from "./DevQuickLogin";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import { reloadAfterLogin, useAuthDialog } from "./useAuthDialog";

type Providers = Awaited<ReturnType<typeof getProviders>>;

const socialIcons: Record<string, string> = {
  github: "/img/socialMedia/github_icon.png",
  discord: "/img/socialMedia/discord_icon.png",
  google: "/img/socialMedia/google_icon.png",
};

export function AuthDialog() {
  const t = useT();
  const { isOpen, mode, error, callbackUrl, open, close } = useAuthDialog();
  const [providers, setProviders] = useState<Providers>(null);

  useEffect(() => {
    if (isOpen) {
      void getProviders().then(setProviders);
    }
  }, [isOpen]);

  const errorMessages: Record<string, string> = {
    Callback: t.auth.providerError,
    OAuthAccountNotLinked: t.auth.emailAlreadyLinked,
    ProtectedPage: t.auth.protectedPage,
  };

  const onSuccess = () => reloadAfterLogin(callbackUrl);
  const socialProviders = Object.values(providers ?? {}).filter(({ type }) => type === "oauth");
  const isLogin = mode === "login";

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      size="sm"
      title={isLogin ? t.auth.loginTitle : t.auth.signupTitle}
    >
      <div className="@flex @flex-col @gap-4">
        {providers?.["dev-login"] !== undefined && <DevQuickLogin onSuccess={onSuccess} />}

        {isLogin ? (
          <LoginForm
            initialError={error === undefined ? undefined : errorMessages[error]}
            onSuccess={onSuccess}
          />
        ) : (
          <SignupForm onSuccess={onSuccess} />
        )}

        {socialProviders.length > 0 && (
          <div className="@flex @flex-col @gap-2">
            <p className="@text-center @text-xs @text-fg-muted">{t.auth.continueWith}</p>
            {socialProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="secondary"
                fullWidth
                icon={<img src={socialIcons[provider.id]} alt="" className="@h-4 @w-4" />}
                onClick={() => void signIn(provider.id, { callbackUrl })}
              >
                {provider.name}
              </Button>
            ))}
          </div>
        )}

        <p className="@flex @items-center @justify-center @gap-1 @text-sm @text-fg-muted">
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}
          <button
            type="button"
            className="@font-semibold @text-accent hover:@text-accent-hover"
            onClick={() => open(isLogin ? "signup" : "login")}
          >
            {isLogin ? t.account.signup : t.account.login}
          </button>
        </p>
      </div>
    </Dialog>
  );
}
