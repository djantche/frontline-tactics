import { ShaderPicker } from "frontend/components/settings/ShaderPicker";
import { useShader } from "frontend/settings/game-settings";
import { Card } from "frontend/ui/Card";
import { Page, PageHeader } from "frontend/ui/Page";
import { Select } from "frontend/ui/Select";
import { Skeleton } from "frontend/ui/Skeleton";
import type { Locale } from "i18n";
import { localeNames, locales, useLocale, useT } from "i18n";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

// Pixi only runs in the browser
const ShaderPreview = dynamic(
  () => import("components/client-only/ShaderPreview").then((res) => res.ShaderPreview),
  { ssr: false, loading: () => <Skeleton className="@h-64 @w-full" /> },
);

const oneYearInSeconds = 60 * 60 * 24 * 365;

export default function SettingsPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [shader, setShader] = useShader();
  const labels = t.settings;

  const changeLocale = (next: Locale) => {
    // Next.js reads this cookie to open the site in the chosen language next time
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
    void router.push(router.asPath, router.asPath, { locale: next, scroll: false });
  };

  return (
    <Page title={labels.title}>
      <PageHeader title={labels.title} description={labels.description} />

      <div className="@flex @flex-col @gap-6">
        <Card className="@p-4">
          <h2 className="@text-2xl @leading-tight">{labels.language}</h2>
          <p className="@mb-3 @text-sm @text-fg-muted">{labels.languageHint}</p>
          <Select<Locale>
            label={labels.language}
            className="@max-w-xs"
            value={locale}
            onChange={changeLocale}
            options={locales.map((value) => ({ value, label: localeNames[value] }))}
          />
        </Card>

        <Card className="@p-4">
          <h2 className="@text-2xl @leading-tight">{labels.graphics}</h2>
          <p className="@mb-3 @text-sm @text-fg-muted">{labels.graphicsHint}</p>
          <div className="@flex @flex-col @gap-4">
            <ShaderPicker value={shader} onChange={setShader} />
            <ShaderPreview shader={shader} />
          </div>
        </Card>
      </div>
    </Page>
  );
}
