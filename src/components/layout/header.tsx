import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Fonctionnalités
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Tarifs
          </Link>
          <Link
            href="/#faq"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login?plan=annual" className="hidden sm:block">
            <Button variant="ghost" size="sm">Connexion</Button>
          </Link>
          <Link href="/signup?plan=annual">
            <Button size="sm">S&apos;inscrire</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
