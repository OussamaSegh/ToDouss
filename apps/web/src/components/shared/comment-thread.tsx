"use client";

import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface CommentUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface MentionUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface MentionItem {
  id: string;
  userId: string;
  user: MentionUser;
}

interface ReactionItem {
  id: string;
  userId: string;
  emoji: string;
}

export interface CommentThreadItem {
  id: string;
  authorId: string;
  body: string;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  author: CommentUser;
  mentions: MentionItem[];
  reactions: ReactionItem[];
}

interface CommentThreadProps {
  comments: CommentThreadItem[];
  currentUserId: string;
  onDelete: (commentId: string) => void;
  onReact: (commentId: string, emoji: string) => void;
  onUnreact: (commentId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ["👍", "🎉", "❤️", "👀"];

function renderBody(body: string) {
  // Render mention token @[Name](id) as @Name
  return body.replace(/@\[(.*?)\]\((.*?)\)/g, "@$1");
}

export function CommentThread({
  comments,
  currentUserId,
  onDelete,
  onReact,
  onUnreact,
}: CommentThreadProps) {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const byEmoji = comment.reactions.reduce<Record<string, ReactionItem[]>>(
          (acc, reaction) => {
            const bucket = acc[reaction.emoji] ?? [];
            bucket.push(reaction);
            acc[reaction.emoji] = bucket;
            return acc;
          },
          {},
        );

        return (
          <div
            key={comment.id}
            className="rounded-md border border-border bg-muted/20 p-3"
            onMouseEnter={() => setActiveCommentId(comment.id)}
            onMouseLeave={() => setActiveCommentId(null)}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {comment.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.author.avatarUrl}
                    alt={comment.author.name ?? ""}
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
                    {(comment.author.name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">
                  {comment.author.name ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>

              {comment.authorId === currentUserId && activeCommentId === comment.id && (
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Delete
                </button>
              )}
            </div>

            <p className="whitespace-pre-wrap text-sm">{renderBody(comment.body)}</p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {Object.entries(byEmoji).map(([emoji, reactions]) => {
                const reactedByMe = reactions.some((r) => r.userId === currentUserId);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() =>
                      reactedByMe
                        ? onUnreact(comment.id, emoji)
                        : onReact(comment.id, emoji)
                    }
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      reactedByMe
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    {emoji} {reactions.length}
                  </button>
                );
              })}

              <div className="ml-1 flex items-center gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(comment.id, emoji)}
                    className="rounded px-1 py-0.5 text-xs hover:bg-muted/60"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
