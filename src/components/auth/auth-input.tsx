import { cn } from "@/lib/utils";

export function AuthInput({
  id,
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-zinc-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20",
          error ? "border-red-300 focus:border-red-400 focus:ring-red-400/20" : "border-zinc-200",
          className
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
