import { ButtonLink } from "frontend/ui/Button";
import { Page } from "frontend/ui/Page";
import { useT } from "i18n";
import { MapPinOff } from "lucide-react";

export default function Custom404() {
  const t = useT();

  return (
    <Page title={t.notFound.title}>
      <div className="@flex @flex-col @items-center @gap-3 @py-24 @text-center">
        <MapPinOff className="@h-12 @w-12 @text-accent" aria-hidden />
        <h1 className="@text-5xl">{t.notFound.title}</h1>
        <p className="@text-fg-muted">{t.notFound.text}</p>
        <ButtonLink href="/" className="@mt-3">
          {t.notFound.back}
        </ButtonLink>
      </div>
    </Page>
  );
}
