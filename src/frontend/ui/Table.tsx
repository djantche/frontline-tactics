import type { ComponentProps } from "react";
import { cx } from "./cx";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="@overflow-x-auto @border @border-line">
      <table className={cx("@w-full @border-collapse @text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cx(
        "@whitespace-nowrap @border-b @border-line @bg-raised @px-3 @py-2 @text-left @text-xs @font-semibold @uppercase @tracking-wide @text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cx("@border-b @border-line @px-3 @py-2", className)} {...props} />;
}
