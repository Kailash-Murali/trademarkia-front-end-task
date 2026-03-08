"use client";

import { cn } from "@/lib/utils";

interface Props {
  pending: boolean;
}

export function SyncIndicator({ pending }: Props) {
  return (
    <div className="flex items-center gap-1.5" title={pending ? "Saving…" : "Saved"}>
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          pending ? "animate-pulse bg-yellow-400" : "bg-green-400"
        )}
      />
      <span className="text-[10px] text-gray-400">
        {pending ? "Saving" : "Saved"}
      </span>
    </div>
  );
}
