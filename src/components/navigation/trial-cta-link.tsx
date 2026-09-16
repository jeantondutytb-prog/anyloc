"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationProgress } from "@/components/navigation/navigation-progress";

type TrialCtaLinkProps = {
  href: string;
  label: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary";
  className?: string;
  buttonClassName?: string;
  showArrow?: boolean;
};

export function TrialCtaLink({
  href,
  label,
  size = "lg",
  variant = "default",
  className,
  buttonClassName,
  showArrow = true,
}: TrialCtaLinkProps) {
  const pathname = usePathname();
  const { start } = useNavigationProgress();
  const destination = href.split("#")[0] || href;

  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (destination !== pathname) {
          start();
        }
      }}
    >
      <Button size={size} variant={variant} className={buttonClassName}>
        {label}
        {showArrow ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </Link>
  );
}
