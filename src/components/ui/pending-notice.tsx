import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PendingBadge } from "@/components/ui/pending-info";

export function PendingNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80">
          <Clock className="h-4 w-4 text-zinc-500" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-zinc-900">{title}</p>
            <PendingBadge />
          </div>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
      </div>
    </Card>
  );
}
