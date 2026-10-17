import Link from "next/link";
import { Banknote } from "lucide-react";
import { CrispContactLink } from "@/components/crisp/crisp-contact-link";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/constants";
import { FOOTER_LINKS, LEGAL_LINKS } from "@/lib/footer-links";

function FooterLink({
  href,
  label,
  highlight,
}: {
  href: string;
  label: string;
  highlight?: boolean;
}) {
  if (href === "/contact") {
    return (
      <CrispContactLink className="hover:text-zinc-900">{label}</CrispContactLink>
    );
  }

  if (highlight) {
    return (
      <Link
        href={href}
        data-track="clipper_link_clicked"
        data-track-location="footer"
        className="inline-flex items-center gap-1.5 font-medium text-zinc-700 hover:text-zinc-900"
      >
        <Banknote className="h-4 w-4 text-pink-600" />
        {label}
      </Link>
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
    // A floating rounded card, like the header pills: no full-width band.
    <footer className="px-2 pb-2 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-200/80 bg-white/85 px-5 py-6 shadow-lg shadow-zinc-900/5 backdrop-blur-md sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo href={null} />
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href} label={link.label} highlight={link.highlight} />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 border-t border-zinc-100 pt-5 text-xs text-zinc-500">
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href} label={link.label} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-zinc-600">
            © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
