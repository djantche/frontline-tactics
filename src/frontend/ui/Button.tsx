import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type StyleProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "@bg-accent @text-accent-fg hover:@bg-accent-hover @border-transparent",
  secondary: "@bg-raised @text-fg hover:@bg-overlay @border-line-strong",
  ghost: "@bg-transparent @text-fg-muted hover:@bg-raised hover:@text-fg @border-transparent",
  danger: "@bg-danger-soft @text-danger hover:@bg-danger hover:@text-fg @border-danger",
};

const sizes: Record<Size, string> = {
  sm: "@h-8 @px-3 @text-sm @gap-1.5",
  md: "@h-10 @px-4 @text-sm @gap-2",
  lg: "@h-12 @px-6 @text-base @gap-2",
};

const buttonClass = ({ variant = "primary", size = "md", fullWidth }: StyleProps) =>
  cx(
    "@inline-flex @items-center @justify-center @whitespace-nowrap @border @font-semibold @transition-colors @cursor-pointer",
    "disabled:@opacity-50 disabled:@cursor-not-allowed",
    variants[variant],
    sizes[size],
    fullWidth === true && "@w-full",
  );

type ButtonProps = ComponentProps<"button"> & StyleProps & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, icon, loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled === true || loading}
      aria-busy={loading}
      className={cx(buttonClass({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? <Loader2 className="@h-4 @w-4 @animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps;

export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cx(buttonClass({ variant, size, fullWidth }), className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
