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
      <label className="text-sm font-medium text-zinc-700 app-dark:text-[#C4C4CA]" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none sm:text-sm transition-colors placeholder:text-zinc-400 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 app-dark:border-[#25252B] app-dark:bg-[#16161A] app-dark:text-[#F4F4F5] app-dark:placeholder:text-[#55555D]",
          error && "border-red-300 focus:border-red-400 focus:ring-red-400/20 app-dark:border-red-500/50",
          className
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 app-dark:text-red-400">
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
      <label className="text-sm font-medium text-zinc-700 app-dark:text-[#C4C4CA]" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          className={cn(
            "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-20 text-base text-zinc-900 sm:text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 app-dark:border-[#25252B] app-dark:bg-[#16161A] app-dark:text-[#F4F4F5] app-dark:placeholder:text-[#55555D]",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 app-dark:text-[#8B8B94] app-dark:hover:text-[#F4F4F5]"
        >
          {showPassword ? "Masquer" : "Afficher"}
        </button>
      </div>
    </div>
  );
}
