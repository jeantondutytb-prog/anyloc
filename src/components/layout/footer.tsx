import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/constants";
import { FOOTER_LINK_GROUPS, SOCIAL_LINKS } from "@/lib/footer-links";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-logo-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Logo href={null} />
            <p className="mt-4 max-w-sm text-sm text-zinc-500">
              {SITE.description}
            </p>
            <div className="mt-4 flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 transition-colors hover:text-pink-600"
                >
                  {social.label}
                </Link>
              ))}
            </div>
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-zinc-900">{group.title}</h4>
              <ul className="mt-4 space-y-2 text-sm text-zinc-500">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-zinc-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
