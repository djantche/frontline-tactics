import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className="@flex @flex-col @items-center @gap-2 @border @border-dashed @border-line-strong @px-6 @py-12 @text-center">
      {icon !== undefined && <div className="@mb-1 @text-fg-subtle">{icon}</div>}
      <h3 className="@text-xl @text-fg">{title}</h3>
      {text !== undefined && <p className="@max-w-md @text-sm @text-fg-muted">{text}</p>}
      {action !== undefined && <div className="@mt-3">{action}</div>}
    </div>
  );
}
