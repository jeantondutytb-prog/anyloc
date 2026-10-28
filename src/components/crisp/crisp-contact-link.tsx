"use client";

import { openCrispChat } from "@/components/crisp/crisp-loader";

type CrispContactLinkProps = {
  children: React.ReactNode;
  className?: string;
};

export function CrispContactLink({ children, className }: CrispContactLinkProps) {
  function openChat(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openCrispChat();
  }

  return (
    <a href="#contact" onClick={openChat} className={className}>
      {children}
    </a>
  );
}
