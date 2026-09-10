import type { ReactNode } from "react";

export function StaticPage({
  title,
  description,
  lastUpdated,
  children,
}: {
  title: string;
  description?: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 text-lg text-zinc-600">{description}</p>
        ) : null}
        {lastUpdated ? (
          <p className="mt-2 text-sm text-zinc-500">
            Dernière mise à jour : {lastUpdated}
          </p>
        ) : null}
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600">
          {children}
        </div>
      </div>
    </section>
  );
}

export function StaticSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export function StaticList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
