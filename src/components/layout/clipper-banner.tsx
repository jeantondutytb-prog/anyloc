import Link from "next/link";

/** Thin bar above the navbar, on every marketing page: recruits TikTok clippers. */
export function ClipperBanner() {
  return (
    <Link
      href="/clippeurs?utm_campaign=banner"
      data-track="clipper_link_clicked"
      data-track-location="banner"
      className="group flex h-9 items-center justify-center gap-2 bg-zinc-900 px-4 text-[13px] text-zinc-200 transition-colors hover:bg-zinc-800"
    >
      <span className="sm:hidden">Payé pour poster des TikTok</span>
      <span className="hidden sm:inline">
        Tu fais des TikTok ? Anyloc gratuit, et payé pour tes clips.
      </span>
      <span className="font-semibold text-pink-300 underline decoration-pink-300/40 underline-offset-4 group-hover:decoration-pink-300">
        Deviens clippeur
      </span>
    </Link>
  );
}
