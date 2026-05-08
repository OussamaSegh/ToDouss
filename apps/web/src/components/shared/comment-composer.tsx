"use client";

import { useMemo, useState } from "react";

interface MemberOption {
  id: string;
  name: string | null;
  email: string;
}

interface CommentComposerProps {
  members: MemberOption[];
  isSubmitting?: boolean;
  onSubmit: (body: string) => void;
  textareaId?: string;
}

export function CommentComposer({
  members,
  isSubmitting,
  onSubmit,
  textareaId,
}: CommentComposerProps) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");

  const mentionCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q.startsWith("@")) return [];
    const needle = q.slice(1);
    return members
      .filter((m) =>
        `${m.name ?? ""} ${m.email}`.toLowerCase().includes(needle),
      )
      .slice(0, 5);
  }, [members, query]);

  function applyMention(member: MemberOption) {
    const token = `@[${member.name ?? member.email}](${member.id})`;
    const parts = value.split(/\s+/);
    parts.pop();
    const next = `${parts.join(" ")} ${token} `.trimStart();
    setValue(next);
    setQuery("");
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
    setQuery("");
  }

  return (
    <div className="space-y-2">
      <textarea
        id={textareaId}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          const lastWord = next.split(/\s+/).pop() ?? "";
          setQuery(lastWord);
        }}
        placeholder="Write a comment... Use @ to mention teammates."
        className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        rows={3}
      />

      {mentionCandidates.length > 0 && (
        <div className="rounded-md border border-border bg-popover p-1">
          {mentionCandidates.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => applyMention(m)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60"
            >
              <span className="font-medium">{m.name ?? "Unnamed user"}</span>
              <span className="text-xs text-muted-foreground">{m.email}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting || !value.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isSubmitting ? "Posting..." : "Post comment"}
        </button>
      </div>
    </div>
  );
}
