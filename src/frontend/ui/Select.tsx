import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type Props<T extends string> = {
  label: string;
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
}: Props<T>) {
  const selected = options.find((option) => option.value === value);

  return (
    <Listbox
      as="div"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={cx("@relative @flex @flex-col @gap-1.5", className)}
    >
      <Listbox.Label className="@text-sm @font-medium @text-fg">{label}</Listbox.Label>
      <Listbox.Button className="@flex @h-10 @w-full @items-center @gap-2 @border @border-line-strong @bg-raised @px-3 @text-left @text-sm @text-fg @transition-colors hover:@border-fg-subtle disabled:@opacity-50 disabled:@cursor-not-allowed">
        {selected?.icon}
        <span className={cx("@flex-1 @truncate", selected === undefined && "@text-fg-subtle")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="@h-4 @w-4 @shrink-0 @text-fg-muted" aria-hidden />
      </Listbox.Button>
      <Listbox.Options className="@absolute @top-full @z-30 @mt-1 @max-h-64 @w-full @overflow-auto @border @border-line-strong @bg-overlay @py-1 @shadow-xl @shadow-black/40 focus:@outline-none">
        {options.map((option) => (
          <Listbox.Option
            key={option.value}
            value={option.value}
            className={({ active }) =>
              cx(
                "@flex @cursor-pointer @items-center @gap-2 @px-3 @py-2 @text-sm",
                active ? "@bg-line-strong @text-fg" : "@text-fg-muted",
              )
            }
          >
            {({ selected: isSelected }) => (
              <>
                {option.icon}
                <span className={cx("@flex-1 @truncate", isSelected && "@font-semibold @text-fg")}>
                  {option.label}
                </span>
                {isSelected && <Check className="@h-4 @w-4 @text-accent" aria-hidden />}
              </>
            )}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
}
