export function AuthDivider({ label = "ou" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
      <span className="h-px flex-1 bg-zinc-200" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}
