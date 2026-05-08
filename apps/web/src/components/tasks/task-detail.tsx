"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@todouss/ui";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, Loader2, Plus } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Link } from "@tiptap/extension-link";
import { useShallow } from "zustand/react/shallow";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import { useTaskStore } from "@/stores/task-store";
import {
  useUpdateTask,
  useDeleteTask,
  useCreateTask,
} from "@/hooks/use-task-mutations";
import { StatusSelect, StatusCheckbox } from "@/components/shared/status-select";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { DueDatePicker } from "@/components/shared/due-date-picker";
import { LabelMultiSelect } from "@/components/shared/label-multi-select";
import { CommentComposer } from "@/components/shared/comment-composer";
import { CommentThread } from "@/components/shared/comment-thread";
import {
  useCreateComment,
  useDeleteComment,
  useReactToComment,
  useUnreactToComment,
} from "@/hooks/use-comment-mutations";
import type { TaskStatus } from "@/components/shared/status-select";
import type { Priority } from "@/components/shared/priority-badge";

const PRIORITY_OPTIONS: Priority[] = ["P1", "P2", "P3", "P4"];

function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-muted/60 transition-colors"
      >
        <PriorityBadge priority={value} variant="badge" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-md border border-border bg-popover shadow-md py-1">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
            >
              <PriorityBadge priority={p} variant="badge" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SubtaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
}

function SubtaskList({
  parentTaskId,
  workspaceId,
  projectId,
  subtasks,
}: {
  parentTaskId: string;
  workspaceId: string;
  projectId: string | null;
  subtasks: SubtaskRow[];
}) {
  const openDetail = useTaskStore((s) => s.openDetail);
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) {
      setAdding(false);
      return;
    }
    createTask.mutate({
      workspaceId,
      parentTaskId,
      projectId: projectId ?? undefined,
      title,
      status: "TODO",
      priority: "P4",
    });
    setNewTitle("");
    setAdding(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setAdding(false);
      setNewTitle("");
    }
  }

  const completed = subtasks.filter((s) => s.status === "DONE").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          Subtasks
          {subtasks.length > 0 && (
            <span className="ml-1.5 text-muted-foreground/60">
              {completed}/{subtasks.length}
            </span>
          )}
        </p>
      </div>

      <div className="space-y-0.5">
        {subtasks.map((sub) => {
          const isDone = sub.status === "DONE";
          const isCancelled = sub.status === "CANCELLED";
          return (
            <div
              key={sub.id}
              onClick={() => openDetail(sub.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer",
                "hover:bg-muted/40 transition-colors",
              )}
            >
              <StatusCheckbox
                status={sub.status as Parameters<typeof StatusCheckbox>[0]["status"]}
                priority={sub.priority as Parameters<typeof StatusCheckbox>[0]["priority"]}
                onChange={(newStatus) =>
                  updateTask.mutate({
                    id: sub.id,
                    workspaceId,
                    status: newStatus,
                  })
                }
              />
              <span
                className={cn(
                  "flex-1 text-sm leading-snug select-none truncate",
                  (isDone || isCancelled) && "line-through text-muted-foreground",
                )}
              >
                {sub.title}
              </span>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder="Subtask title"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors mt-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add subtask
        </button>
      )}
    </div>
  );
}

function TaskDetailContent({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { user } = useUser();
  const closeDetail = useTaskStore((s) => s.closeDetail);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const reactComment = useReactToComment();
  const unreactComment = useUnreactToComment();

  const { data: task, isLoading } = trpc.task.get.useQuery({
    workspaceId: workspace.id,
    taskId,
  });
  const { data: commentsData } = trpc.comment.listByTask.useQuery(
    {
      workspaceId: workspace.id,
      taskId,
    },
    { enabled: !!task },
  );
  const { data: workspaceMembers } = trpc.workspace.members.useQuery({
    workspaceId: workspace.id,
  });

  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Add description…" }),
      Link.configure({ openOnClick: false }),
    ],
    content: task?.description ?? "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[100px] focus:outline-none text-foreground",
      },
    },
    onBlur: ({ editor: ed }) => {
      if (!task) return;
      const html = ed.getHTML();
      if (html !== task.description) {
        updateTask.mutate({
          id: task.id,
          workspaceId: workspace.id,
          description: html,
        });
      }
    },
  });

  // Update editor content when task description changes from server
  useEffect(() => {
    if (!editor || !task) return;
    const current = editor.getHTML();
    if (task.description && current !== task.description) {
      editor.commands.setContent(task.description);
    }
  }, [task, task?.description, editor]);

  useEffect(() => {
    function focusComment() {
      if (!task) return;
      const el = document.getElementById(`comment-composer-${task.id}`);
      el?.focus();
    }
    document.addEventListener("todouss:focus-comment", focusComment as EventListener);
    return () =>
      document.removeEventListener(
        "todouss:focus-comment",
        focusComment as EventListener,
      );
  }, [task]);

  function saveTitle() {
    if (!task || !titleRef.current) return;
    const next = titleRef.current.value.trim();
    if (!next || next === task.title) return;
    updateTask.mutate({ id: task.id, workspaceId: workspace.id, title: next });
  }

  function handleDelete() {
    if (!task) return;
    deleteTask.mutate({ workspaceId: workspace.id, taskId: task.id });
    closeDetail();
  }

  const currentUserId =
    workspaceMembers?.find((m) => m.user.clerkId === user?.id)?.userId ?? "";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Task not found
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <StatusSelect
            value={task.status as TaskStatus}
            onChange={(status) =>
              updateTask.mutate({ id: task.id, workspaceId: workspace.id, status })
            }
            showLabel
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closeDetail}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Editable title — uncontrolled, remounts on task change via key */}
        <textarea
          key={task.id}
          ref={titleRef}
          defaultValue={task.title}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              titleRef.current?.blur();
            }
          }}
          className="w-full resize-none bg-transparent text-lg font-semibold leading-snug focus:outline-none placeholder:text-muted-foreground/60"
          placeholder="Task title"
          rows={1}
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
        />

        {/* Properties */}
        <div className="space-y-2">
          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Priority</span>
            <PrioritySelect
              value={task.priority as Priority}
              onChange={(priority) =>
                updateTask.mutate({ id: task.id, workspaceId: workspace.id, priority })
              }
            />
          </div>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Due date</span>
            <DueDatePicker
              value={task.dueDate ? new Date(task.dueDate) : null}
              onChange={(date) =>
                updateTask.mutate({
                  id: task.id,
                  workspaceId: workspace.id,
                  dueDate: date ?? null,
                })
              }
            />
          </div>

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">Assignee</span>
              <div className="flex items-center gap-2">
                {task.assignee.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={task.assignee.avatarUrl}
                    alt={task.assignee.name ?? ""}
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs">
                    {task.assignee.name?.charAt(0) ?? "?"}
                  </div>
                )}
                <span className="text-sm text-foreground">
                  {task.assignee.name}
                </span>
              </div>
            </div>
          )}

          {/* Labels */}
          <div className="flex items-start gap-3">
            <span className="w-20 shrink-0 text-xs text-muted-foreground pt-1">Labels</span>
            <LabelMultiSelect
              value={task.labels.map((tl) => ({
                id: tl.label.id,
                name: tl.label.name,
                color: tl.label.color,
              }))}
              onChange={(labelIds) =>
                updateTask.mutate({ id: task.id, workspaceId: workspace.id, labelIds })
              }
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* TipTap description */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Description</p>
          <EditorContent editor={editor} />
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Subtasks */}
        <SubtaskList
          parentTaskId={task.id}
          workspaceId={workspace.id}
          projectId={task.projectId}
          subtasks={task.subtasks.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            priority: s.priority,
          }))}
        />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Comments */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Comments</p>
          <CommentComposer
            textareaId={`comment-composer-${task.id}`}
            members={(workspaceMembers ?? []).map((m) => ({
              id: m.userId,
              name: m.user.name,
              email: m.user.email,
            }))}
            isSubmitting={createComment.isPending}
            onSubmit={(body) =>
              createComment.mutate({
                workspaceId: workspace.id,
                taskId: task.id,
                body,
              })
            }
          />
          <CommentThread
            comments={(commentsData ?? []).map((c) => ({
              id: c.id,
              authorId: c.authorId,
              body: c.body,
              isEdited: c.isEdited,
              editedAt: c.editedAt,
              createdAt: c.createdAt,
              author: c.author,
              mentions: c.mentions,
              reactions: c.reactions,
            }))}
            currentUserId={currentUserId}
            onDelete={(commentId) =>
              deleteComment.mutate({ workspaceId: workspace.id, commentId })
            }
            onReact={(commentId, emoji) =>
              reactComment.mutate({ workspaceId: workspace.id, commentId, emoji })
            }
            onUnreact={(commentId, emoji) =>
              unreactComment.mutate({ workspaceId: workspace.id, commentId, emoji })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function TaskDetailPanel() {
  const { selectedTaskId, isDetailOpen, closeDetail } = useTaskStore(
    useShallow((s) => ({
      selectedTaskId: s.selectedTaskId,
      isDetailOpen: s.isDetailOpen,
      closeDetail: s.closeDetail,
    })),
  );

  // Close on outside click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) closeDetail();
  }

  return (
    <AnimatePresence>
      {isDetailOpen && selectedTaskId && (
        <>
          {/* Invisible backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleBackdropClick}
          />

          {/* Slide-in panel */}
          <motion.div
            key="task-detail"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-[480px] max-w-full",
              "border-l border-border bg-background shadow-xl",
            )}
          >
            <TaskDetailContent taskId={selectedTaskId} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
