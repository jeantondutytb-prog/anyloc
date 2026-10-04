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
    // The bubble may be hidden on this page: show it before opening the chat.
    window.$crisp?.push(["do", "chat:show"]);
    window.$crisp?.push(["do", "chat:open"]);
  }

  return (
    <a href="#contact" onClick={openChat} className={className}>
      {children}
    </a>
  );
}
