export type FooterLink = {
  label: string;
  href: string;
  /** Drawn in color to stand out from the plain links. */
  highlight?: boolean;
};

export type SocialLink = {
  label: string;
  href?: string;
  available: boolean;
  description: string;
};

export const FOOTER_LINKS: FooterLink[] = [
  { label: "Nous contacter", href: "/contact" },
  { label: "Gagne de l'argent", href: "/clippeurs?utm_campaign=site_footer", highlight: true },
  { label: "Affiliation", href: "/affiliation" },
];

/** Required for payments and consumer law: kept, but in small print. */
export const LEGAL_LINKS: FooterLink[] = [
  { label: "Conditions générales", href: "/conditions-generales" },
  { label: "Confidentialité", href: "/politique-de-confidentialite" },
  { label: "Remboursement", href: "/politique-de-remboursement" },
  { label: "Annulation", href: "/politique-d-annulation" },
  { label: "Livraison", href: "/politique-de-livraison" },
  { label: "Attestation légale", href: "/attestation-legale" },
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "Discord",
    available: false,
    description: "Chat en direct, support communautaire et annonces.",
  },
  {
    label: "Instagram",
    available: false,
    description: "Contenus, tutos et coulisses du produit.",
  },
];
