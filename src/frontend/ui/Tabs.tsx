import { Tab } from "@headlessui/react";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type TabItem = {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
};

type Props = {
  items: TabItem[];
  selectedIndex?: number;
  onChange?: (index: number) => void;
};

export function Tabs({ items, selectedIndex, onChange }: Props) {
  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={onChange}>
      <Tab.List className="@flex @gap-1 @overflow-x-auto @border-b @border-line">
        {items.map((item) => (
          <Tab
            key={item.key}
            className={({ selected }) =>
              cx(
                "@flex @items-center @gap-2 @whitespace-nowrap @border-b-2 @px-4 @py-2.5 @text-sm @font-semibold @transition-colors",
                selected
                  ? "@border-accent @text-fg"
                  : "@border-transparent @text-fg-muted hover:@text-fg",
              )
            }
          >
            {item.label}
            {item.count !== undefined && (
              <span className="@bg-overlay @px-1.5 @text-xs @font-medium @text-fg-muted">
                {item.count}
              </span>
            )}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="@pt-5">
        {items.map((item) => (
          <Tab.Panel key={item.key}>{item.content}</Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}
