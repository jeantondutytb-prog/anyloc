import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { src: 256, className: "h-6 w-6" },
  md: { src: 512, className: "h-8 w-8" },
  lg: { src: 768, className: "h-12 w-12" },
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
  const { src, className: imageClassName } = sizes[size];

  const content = (
    <>
      <span
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-xl bg-logo-background",
          imageClassName
        )}
      >
        <Image
          src="/logo.png"
          alt={`${SITE.name} logo`}
          width={src}
          height={src}
          unoptimized
          className="h-full w-full object-contain"
          priority
        />
      </span>
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
