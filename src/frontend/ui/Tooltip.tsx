import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
};

export function Tooltip({ label, children }: Props) {
  return (
    <span className="@group @relative @inline-flex">
      {children}
      <span
        role="tooltip"
        className="@pointer-events-none @absolute @bottom-full @left-1/2 @z-40 @mb-1.5 @-translate-x-1/2 @whitespace-nowrap @border @border-line-strong @bg-overlay @px-2 @py-1 @text-xs @text-fg @opacity-0 @transition-opacity group-hover:@opacity-100 group-focus-within:@opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
