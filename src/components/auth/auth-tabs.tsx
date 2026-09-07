import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/login", label: "Connexion", mode: "login" as const },
  { href: "/signup", label: "Inscription", mode: "signup" as const },
];

export function AuthTabs({ mode }: { mode: "login" | "signup" }) {
  return (
    <nav
      className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1"
      aria-label="Navigation authentification"
    >
      {tabs.map((tab) => {
        const active = tab.mode === mode;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-center text-sm font-medium transition",
              active
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
