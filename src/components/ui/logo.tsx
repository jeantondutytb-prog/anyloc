import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { px: 24, className: "h-6 w-6" },
  md: { px: 32, className: "h-8 w-8" },
  lg: { px: 48, className: "h-12 w-12" },
} as const;

type LogoProps = {
  showName?: boolean;
  size?: keyof typeof sizes;
  href?: string | null;
  className?: string;
  nameClassName?: string;
};

export function Logo({
  showName = true,
  size = "md",
  href = "/",
  className,
  nameClassName,
}: LogoProps) {
  const { px, className: imageClassName } = sizes[size];

  const content = (
    <>
      <Image
        src="/logo.png"
        alt={`${SITE.name} logo`}
        width={px}
        height={px}
        className={cn(imageClassName, "object-contain")}
        priority
      />
      {showName && (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            nameClassName
          )}
        >
          {SITE.name}
        </span>
      )}
    </>
  );

  const wrapperClassName = cn("flex items-center gap-2", className);

  if (href) {
    return (
      <Link href={href} className={wrapperClassName}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClassName}>{content}</div>;
}
