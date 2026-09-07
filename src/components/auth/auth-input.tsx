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
      <label
        className="mb-1.5 block text-sm font-medium text-zinc-500"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white",
          error && "border-red-300 focus:border-red-400",
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

export function AuthPasswordInput({
  id,
  label,
  showPassword,
  onToggle,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-sm font-medium text-zinc-500"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          className={cn(
            "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 pr-11 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          {showPassword ? "Masquer" : "Afficher"}
        </button>
      </div>
    </div>
  );
}
