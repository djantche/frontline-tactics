import type { ComponentProps } from "react";
import { forwardRef, useId } from "react";
import { cx } from "./cx";

type Props = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string;
};

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, hint, error, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = `${inputId}-description`;
  const description = error ?? hint;

  return (
    <div className={cx("@flex @flex-col @gap-1.5", className)}>
      <label htmlFor={inputId} className="@text-sm @font-medium @text-fg">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error !== undefined}
        aria-describedby={description === undefined ? undefined : describedById}
        className={cx(
          "@h-10 @w-full @border @bg-raised @px-3 @text-sm @text-fg @transition-colors placeholder:@text-fg-subtle",
          error === undefined ? "@border-line-strong hover:@border-fg-subtle" : "@border-danger",
        )}
        {...props}
      />
      {description !== undefined && (
        <p
          id={describedById}
          className={cx("@text-xs", error === undefined ? "@text-fg-muted" : "@text-danger")}
        >
          {description}
        </p>
      )}
    </div>
  );
});
