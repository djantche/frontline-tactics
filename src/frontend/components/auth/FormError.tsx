import { AlertTriangle } from "lucide-react";

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="@flex @items-start @gap-2 @border @border-danger @bg-danger-soft @px-3 @py-2 @text-sm @text-fg"
    >
      <AlertTriangle className="@mt-0.5 @h-4 @w-4 @shrink-0 @text-danger" aria-hidden />
      {message}
    </p>
  );
}
