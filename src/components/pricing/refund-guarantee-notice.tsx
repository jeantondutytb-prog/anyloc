import Link from "next/link";
import { REFUND_GUARANTEE_SUMMARY } from "@/lib/constants";

export function RefundGuaranteeNotice({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-sm text-zinc-600"}>
      {REFUND_GUARANTEE_SUMMARY}{" "}
      <Link
        href="/politique-de-remboursement"
        className="text-pink-600 hover:underline"
      >
        En savoir plus
      </Link>
    </p>
  );
}
