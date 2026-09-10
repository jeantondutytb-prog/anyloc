"use client";

type CrispContactLinkProps = {
  children: React.ReactNode;
  className?: string;
};

declare global {
  interface Window {
    $crisp?: Array<[string, ...unknown[]]>;
  }
}

export function CrispContactLink({ children, className }: CrispContactLinkProps) {
  function openChat(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.$crisp?.push(["do", "chat:open"]);
  }

  return (
    <a href="#contact" onClick={openChat} className={className}>
      {children}
    </a>
  );
}
