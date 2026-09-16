"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigationProgress } from "@/components/navigation/navigation-progress";

type TrialCtaLinkProps = {
  href: string;
  label: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary";
  className?: string;
  buttonClassName?: string;
  showArrow?: boolean;
  loadingLabel?: string;
};

export function TrialCtaLink({
  href,
  label,
  size = "lg",
  variant = "default",
  className,
  buttonClassName,
  showArrow = true,
  loadingLabel = "Chargement…",
}: TrialCtaLinkProps) {
  const pathname = usePathname();
  const { start } = useNavigationProgress();
  const [pending, setPending] = useState(false);
  const destination = href.split("#")[0] || href;

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  return (
    <Link
      href={href}
      className={className}
      aria-busy={pending}
      onClick={() => {
        if (destination !== pathname) {
          start();
          setPending(true);
        }
      }}
    >
      <Button
        size={size}
        variant={variant}
        disabled={pending}
        className={cn(buttonClassName, pending && "opacity-95")}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingLabel}
          </>
        ) : (
          <>
            {label}
            {showArrow ? <ArrowRight className="h-4 w-4" /> : null}
          </>
        )}
      </Button>
    </Link>
  );
}
