import { Skeleton } from "frontend/ui/Skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

export const ProtectPage = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      void router.replace({
        pathname: "/",
        query: { authModalOpen: "", error: "ProtectedPage", callbackUrl: window.location.href },
      });
    },
  });

  if (status === "loading") {
    return <Skeleton className="@mx-auto @mt-8 @h-64 @w-full @max-w-6xl" />;
  }

  return <>{children}</>;
};
