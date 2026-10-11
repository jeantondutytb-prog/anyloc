import Link from "next/link";
import { CrispContactLink } from "@/components/crisp/crisp-contact-link";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/constants";
import { FOOTER_LINKS, LEGAL_LINKS } from "@/lib/footer-links";

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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Logo href={null} />
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href} label={link.label} />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href} label={link.label} />
              </li>
            ))}
          </ul>
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
