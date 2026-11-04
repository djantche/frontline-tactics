import type { ShaderKind } from "frontend/settings/game-settings";
import { shaderKinds } from "frontend/settings/game-settings";
import { cx } from "frontend/ui/cx";
import { useT } from "i18n";

type Props = {
  value: ShaderKind;
  onChange: (kind: ShaderKind) => void;
};

export function ShaderPicker({ value, onChange }: Props) {
  const t = useT();

  return (
    <fieldset className="@grid @gap-2 tablet:@grid-cols-2">
      <legend className="@sr-only">{t.settings.shaderLabel}</legend>
      {shaderKinds.map((kind) => (
        <label
          key={kind}
          className={cx(
            "@flex @cursor-pointer @flex-col @gap-0.5 @border @bg-raised @px-3 @py-2 @transition-colors focus-within:@outline focus-within:@outline-2 focus-within:@outline-accent",
            kind === value ? "@border-accent" : "@border-line hover:@border-line-strong",
          )}
        >
          <input
            type="radio"
            name="shader"
            className="@sr-only"
            checked={kind === value}
            onChange={() => onChange(kind)}
          />
          <span className="@text-sm @font-semibold">{t.settings.shaders[kind].name}</span>
          <span className="@text-xs @text-fg-muted">{t.settings.shaders[kind].description}</span>
        </label>
      ))}
    </fieldset>
  );
}
