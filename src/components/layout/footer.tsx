import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-logo-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo href={null} />
            <p className="mt-4 max-w-sm text-sm text-zinc-500">
              {SITE.description}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-900">Produit</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li>
                <Link href="/#features" className="hover:text-zinc-900">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-zinc-900">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-zinc-900">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/web" className="hover:text-zinc-900">
                  Web Spoofing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-900">Installation</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li>
                <Link href="/dashboard/installation" className="hover:text-zinc-900">
                  Guide d&apos;installation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 sm:flex-row">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
          </p>
          <p className="text-xs text-zinc-600">{SITE.domain}</p>
        </div>
      </div>
    </footer>
  );
}
