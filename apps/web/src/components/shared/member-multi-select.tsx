"use client";

import { useMemo, useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import { trpc } from "@/lib/trpc/provider";

interface MemberMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function MemberMultiSelect({ value, onChange }: MemberMultiSelectProps) {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const { data: members } = trpc.workspace.members.useQuery(
    { workspaceId: workspace.id },
    { enabled: open },
  );

  const selected = useMemo(
    () => (members ?? []).filter((m) => value.includes(m.userId)),
    [members, value],
  );

  function toggle(userId: string) {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
      return;
    }
    onChange([...value, userId]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-h-8 rounded-md border border-border bg-background px-2 py-1 text-sm hover:bg-muted/50"
      >
        {selected.length > 0
          ? selected.map((s) => s.user.name ?? s.user.email).join(", ")
          : "Select members"}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-72 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {(members ?? []).map((member) => {
            const checked = value.includes(member.userId);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggle(member.userId)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60 ${
                  checked ? "bg-muted/60" : ""
                }`}
              >
                <span>{member.user.name ?? member.user.email}</span>
                {checked && <span className="text-xs text-primary">Selected</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
