import Link from "next/link";

/** Thin bar above the navbar, on every marketing page: recruits TikTok clippers. */
export function ClipperBanner() {
  return (
    <Link
      href="/clippeurs?utm_campaign=banner"
      data-track="clipper_link_clicked"
      data-track-location="banner"
      className="group flex h-9 items-center justify-center gap-2 bg-pink-600 px-4 text-[13px] text-pink-50 transition-colors hover:bg-pink-700"
    >
      <span className="sm:hidden">Payé pour poster des TikTok</span>
      <span className="hidden sm:inline">
        Tu fais des TikTok ? Anyloc gratuit, et payé pour tes clips.
      </span>
      <span className="font-semibold text-white underline decoration-white/50 underline-offset-4 group-hover:decoration-white">
        Deviens clippeur
      </span>
    </Link>
  );
}
