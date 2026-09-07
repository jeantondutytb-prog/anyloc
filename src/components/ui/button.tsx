import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20",
        secondary:
          "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
        ghost: "text-zinc-400 hover:text-white hover:bg-white/5",
        outline:
          "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
      },
      size: {
        default: "h-11 px-6 text-sm",
        sm: "h-9 px-4 text-sm",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
