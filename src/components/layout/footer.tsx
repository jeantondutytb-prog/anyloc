import Link from "next/link";
import { CrispContactLink } from "@/components/crisp/crisp-contact-link";
import { Logo } from "@/components/ui/logo";
import { PendingBadge } from "@/components/ui/pending-info";
import { SITE } from "@/lib/constants";
import { FOOTER_LINK_GROUPS, SOCIAL_LINKS } from "@/lib/footer-links";

function FooterLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  if (href === "/contact") {
    return (
      <CrispContactLink className="hover:text-zinc-900">{label}</CrispContactLink>
    );
  }

  return (
    <Link href={href} className="hover:text-zinc-900">
      {label}
    </Link>
  );
}

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
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {SOCIAL_LINKS.map((social) =>
                social.available && social.href ? (
                  <Link
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 transition-colors hover:text-pink-600"
                  >
                    {social.label}
                  </Link>
                ) : (
                  <span
                    key={social.label}
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-400"
                  >
                    {social.label}
                    <PendingBadge className="px-2 py-0.5 text-[10px]" />
                  </span>
                )
              )}
            </div>
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-zinc-900">{group.title}</h4>
              <ul className="mt-4 space-y-2 text-sm text-zinc-500">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href} label={link.label} />
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
