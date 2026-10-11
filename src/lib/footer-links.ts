export type FooterLink = {
  label: string;
  href: string;
};

export type SocialLink = {
  label: string;
  href?: string;
  available: boolean;
  description: string;
};

export const FOOTER_LINKS: FooterLink[] = [
  { label: "Tarifs", href: "/pricing" },
  { label: "Deviens clippeur", href: "/clippeurs?utm_campaign=footer" },
  { label: "Affiliation", href: "/affiliation" },
  { label: "À propos", href: "/a-propos" },
  { label: "Communauté", href: "/communaute" },
  { label: "Nous contacter", href: "/contact" },
];

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
