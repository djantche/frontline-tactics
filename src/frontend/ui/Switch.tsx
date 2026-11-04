import { Switch as HeadlessSwitch } from "@headlessui/react";
import { cx } from "./cx";

type Props = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Switch({ label, description, checked, onChange, disabled }: Props) {
  return (
    <HeadlessSwitch.Group as="div" className="@flex @items-center @justify-between @gap-4">
      <div className="@flex @flex-col">
        <HeadlessSwitch.Label className="@text-sm @font-medium @text-fg">
          {label}
        </HeadlessSwitch.Label>
        {description !== undefined && (
          <HeadlessSwitch.Description className="@text-xs @text-fg-muted">
            {description}
          </HeadlessSwitch.Description>
        )}
      </div>
      <HeadlessSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={cx(
          "@relative @inline-flex @h-6 @w-11 @shrink-0 @cursor-pointer @items-center @border @transition-colors disabled:@opacity-50 disabled:@cursor-not-allowed",
          checked ? "@border-accent @bg-accent" : "@border-line-strong @bg-raised",
        )}
      >
        <span
          className={cx(
            "@inline-block @h-4 @w-4 @transition-transform",
            checked ? "@translate-x-6 @bg-accent-fg" : "@translate-x-1 @bg-fg-muted",
          )}
        />
      </HeadlessSwitch>
    </HeadlessSwitch.Group>
  );
}
