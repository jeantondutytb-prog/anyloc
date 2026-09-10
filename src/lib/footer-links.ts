export type FooterLink = {
  label: string;
  href: string;
};

export type FooterLinkGroup = {
  title: string;
  links: FooterLink[];
};

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Aide",
    links: [
      { label: "Communauté", href: "/communaute" },
      { label: "Nous contacter", href: "/contact" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "Propositions commerciales", href: "/propositions-commerciales" },
      { label: "Affiliation", href: "/affiliation" },
      { label: "À propos", href: "/a-propos" },
      { label: "Tarification", href: "/pricing" },
    ],
  },
  {
    title: "Mentions légales",
    links: [
      { label: "Conditions générales", href: "/conditions-generales" },
      { label: "Politique de livraison", href: "/politique-de-livraison" },
      { label: "Attestation légale", href: "/attestation-legale" },
      { label: "Politique de confidentialité", href: "/politique-de-confidentialite" },
      { label: "Politique de remboursement", href: "/politique-de-remboursement" },
      { label: "Politique d'annulation", href: "/politique-d-annulation" },
    ],
  },
];

export const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/anyloc",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/anyloc",
  },
] as const;
