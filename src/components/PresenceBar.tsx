"use client";

import { PresenceData } from "@/lib/types";

interface Props {
  presence: PresenceData[];
  currentUserId: string;
}

export function PresenceBar({ presence, currentUserId }: Props) {
  const others = presence.filter((p) => p.userId !== currentUserId);
  const self = presence.find((p) => p.userId === currentUserId);

  return (
    <div className="flex items-center gap-1">
      {self && (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
          style={{ backgroundColor: self.color }}
          title={`${self.displayName} (you)`}
        >
          {self.displayName[0]?.toUpperCase()}
        </div>
      )}
      {others.map((p) => (
        <div
          key={p.userId}
          className="-ml-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
          style={{ backgroundColor: p.color }}
          title={p.displayName}
        >
          {p.displayName[0]?.toUpperCase()}
        </div>
      ))}
      {others.length > 0 && (
        <span className="ml-1 text-xs text-gray-400">
          {others.length} other{others.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
