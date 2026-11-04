import { useRouter } from "next/router";

export type AuthMode = "login" | "signup";

const dialogParams = ["authModalOpen", "SignUpForm", "error", "callbackUrl"];

/**
 * The login dialog is driven by the URL: next-auth redirects to `/?authModalOpen`
 * (see `pages.signIn` in authOptions) and ProtectPage adds an error and a callback url.
 */
export const useAuthDialog = () => {
  const router = useRouter();

  const replaceQuery = (query: typeof router.query) =>
    void router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
      scroll: false,
    });

  const withoutDialogParams = () =>
    Object.fromEntries(Object.entries(router.query).filter(([key]) => !dialogParams.includes(key)));

  const callbackUrl =
    typeof router.query.callbackUrl === "string" ? router.query.callbackUrl : undefined;

  return {
    isOpen: "authModalOpen" in router.query,
    mode: ("SignUpForm" in router.query ? "signup" : "login") as AuthMode,
    error: typeof router.query.error === "string" ? router.query.error : undefined,
    callbackUrl,
    open: (mode: AuthMode = "login") => {
      replaceQuery({
        ...withoutDialogParams(),
        authModalOpen: "",
        ...(mode === "signup" ? { SignUpForm: "" } : {}),
        ...(callbackUrl === undefined ? {} : { callbackUrl }),
      });
    },
    close: () => {
      replaceQuery(withoutDialogParams());
    },
  };
};

/**
 * Leaves the page after logging in. It has to be a full page load:
 * the websocket used by tRPC only picks up the session cookie when it connects.
 */
export const reloadAfterLogin = (callbackUrl: string | undefined) => {
  const { origin, pathname } = window.location;

  if (callbackUrl !== undefined) {
    const target = new URL(callbackUrl, origin);

    // never follow a callback url pointing at another website
    if (target.origin === origin) {
      window.location.assign(target.pathname + target.search);
      return;
    }
  }

  window.location.assign(pathname);
};
