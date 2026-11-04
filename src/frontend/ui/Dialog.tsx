import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { useT } from "i18n";
import type { ReactNode } from "react";
import { Fragment } from "react";
import { cx } from "./cx";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
};

const sizes = {
  sm: "smallscreen:@max-w-md",
  md: "smallscreen:@max-w-xl",
  lg: "smallscreen:@max-w-3xl",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: Props) {
  const t = useT();

  return (
    <Transition show={open} as={Fragment}>
      <HeadlessDialog onClose={onClose} className="@relative @z-50">
        <Transition.Child
          as={Fragment}
          enter="@transition-opacity @duration-150"
          enterFrom="@opacity-0"
          leave="@transition-opacity @duration-100"
          leaveTo="@opacity-0"
        >
          <div className="@fixed @inset-0 @bg-black/70" aria-hidden />
        </Transition.Child>
        <div className="@fixed @inset-0 @overflow-y-auto">
          <div className="@flex @min-h-full @items-end @justify-center smallscreen:@items-center smallscreen:@p-6">
            <Transition.Child
              as={Fragment}
              enter="@transition @duration-150"
              enterFrom="@opacity-0 @translate-y-2"
              leave="@transition @duration-100"
              leaveTo="@opacity-0"
            >
              <HeadlessDialog.Panel
                className={cx(
                  "@w-full @border @border-line-strong @bg-surface @shadow-2xl @shadow-black/50",
                  sizes[size],
                )}
              >
                <div className="@flex @items-start @justify-between @gap-4 @border-b @border-line @px-5 @py-4">
                  <div>
                    <HeadlessDialog.Title className="@font-display @text-2xl @font-semibold">
                      {title}
                    </HeadlessDialog.Title>
                    {description !== undefined && (
                      <HeadlessDialog.Description className="@mt-1 @text-sm @text-fg-muted">
                        {description}
                      </HeadlessDialog.Description>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t.common.close}
                    className="@p-1 @text-fg-muted @transition-colors hover:@text-fg"
                  >
                    <X className="@h-5 @w-5" aria-hidden />
                  </button>
                </div>
                <div className="@px-5 @py-4">{children}</div>
                {footer !== undefined && (
                  <div className="@flex @justify-end @gap-2 @border-t @border-line @px-5 @py-3">
                    {footer}
                  </div>
                )}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}
