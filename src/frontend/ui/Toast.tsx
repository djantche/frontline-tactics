import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cx } from "./cx";

type ToastTone = "info" | "success" | "error";

type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastContext = { toast: (message: string, tone?: ToastTone) => void };

const toastContext = createContext<ToastContext>({ toast: () => undefined });

const toastDurationMs = 5000;

const icons: Record<ToastTone, ReactNode> = {
  info: <Info className="@h-4 @w-4 @shrink-0 @text-info" aria-hidden />,
  success: <CheckCircle2 className="@h-4 @w-4 @shrink-0 @text-success" aria-hidden />,
  error: <XCircle className="@h-4 @w-4 @shrink-0 @text-danger" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, toastDurationMs);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <toastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="@pointer-events-none @fixed @bottom-4 @right-4 @z-[60] @flex @max-w-sm @flex-col @gap-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={cx(
              "@pointer-events-auto @flex @items-start @gap-2 @border @border-line-strong @bg-overlay @px-3 @py-2.5 @text-sm @shadow-xl @shadow-black/40",
            )}
          >
            <span className="@mt-0.5">{icons[item.tone]}</span>
            {item.message}
          </div>
        ))}
      </div>
    </toastContext.Provider>
  );
}

export const useToast = () => useContext(toastContext).toast;
