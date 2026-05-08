"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { UiButton } from "@todouss/ui";
import { useWorkspace } from "@/lib/workspace-context";
import { trpc } from "@/lib/trpc/provider";
import {
  useCreateInvite,
  useResendInvite,
  useRevokeInvite,
} from "@/hooks/use-invite-mutations";
import type { WorkspaceRole } from "@/types/workspace";

function useWindowOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

function InviteLinkCopy({ inviteToken }: { inviteToken: string }) {
  const [copied, setCopied] = useState(false);
  const origin = useWindowOrigin();

  const fullUrl = origin ? `${origin}/invite/${inviteToken}` : null;

  async function handleCopy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-mono text-muted-foreground break-all max-w-full">
        {fullUrl ?? "Invite link"}
      </span>
      <button
        type="button"
        disabled={!fullUrl}
        onClick={() => void handleCopy()}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function roleLabel(role: WorkspaceRole): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MEMBER":
      return "Member";
    case "VIEWER":
      return "Viewer";
    default:
      return String(role);
  }
}

export default function SettingsPage() {
  const workspace = useWorkspace();
  return <SettingsWorkspacePanels key={workspace.id} />;
}

function SettingsWorkspacePanels() {
  const workspace = useWorkspace();
  const router = useRouter();
  const utils = trpc.useUtils();
  const canManageWorkspace =
    workspace.role === "OWNER" || workspace.role === "ADMIN";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const createInvite = useCreateInvite();
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();

  const { data: invites } = trpc.invite.listPending.useQuery({
    workspaceId: workspace.id,
  });
  const { data: members, isLoading: membersLoading } = trpc.workspace.members.useQuery({
    workspaceId: workspace.id,
  });

  const updateWorkspace = trpc.workspace.update.useMutation({
    async onSuccess(_data, input) {
      await utils.workspace.list.invalidate();
      setEditingName(false);
      setNameDraft("");
      setNameError(null);
      if (input.slug !== undefined && input.slug !== workspace.slug) {
        router.push(`/${input.slug}/settings`);
      } else {
        router.refresh();
      }
    },
    onError(err) {
      setNameError(err.message);
    },
  });

  async function submitName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === workspace.name) {
      setEditingName(false);
      setNameDraft("");
      return;
    }
    setNameError(null);
    await updateWorkspace.mutateAsync({
      workspaceId: workspace.id,
      name: trimmed,
    });
  }

  const pendingInviteCount = invites?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6 shrink-0">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      <div className="p-6 max-w-2xl space-y-8 overflow-auto">
        <section>
          <h2 className="text-base font-semibold mb-4">General</h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Workspace name</p>
                <p className="text-sm text-muted-foreground">
                  Shown across the sidebar and invitations.
                </p>
              </div>
              {canManageWorkspace ? (
                editingName ? (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[200px]">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        className="text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingName(false);
                          setNameDraft("");
                          setNameError(null);
                        }}
                      >
                        Cancel
                      </button>
                      <UiButton
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={updateWorkspace.isPending || !nameDraft.trim()}
                        onClick={() => void submitName()}
                      >
                        {updateWorkspace.isPending ? "Saving…" : "Save"}
                      </UiButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm">{workspace.name}</span>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => {
                        setNameDraft(workspace.name);
                        setEditingName(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )
              ) : (
                <span className="text-sm text-muted-foreground">{workspace.name}</span>
              )}
            </div>

            <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium">Plan</p>
                <p className="text-sm text-muted-foreground">
                  ToDouss is free — every feature, for every workspace.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold">Members</h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            {membersLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading members…</p>
            ) : (members?.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No members found.</p>
            ) : (
              (members ?? []).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.user.name ?? m.user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{roleLabel(m.role as WorkspaceRole)}</span>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {pendingInviteCount} pending invite{pendingInviteCount === 1 ? "" : "s"} — manage below.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold">Invites</h2>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "ADMIN" | "MEMBER" | "VIEWER")
                }
                className="rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="button"
                disabled={createInvite.isPending || !email.trim()}
                onClick={async () => {
                  setInviteError(null);
                  try {
                    await createInvite.mutateAsync({ workspaceId: workspace.id, email, role });
                    setEmail("");
                  } catch (error) {
                    const msg = error instanceof Error ? error.message : "Failed to send invite";
                    setInviteError(msg);
                  }
                }}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {createInvite.isPending ? "Sending..." : "Send invite"}
              </button>
            </div>
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}

            <div className="divide-y divide-border rounded-md border border-border">
              {(invites ?? []).length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  No pending invites.
                </p>
              )}
              {(invites ?? []).map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                    <InviteLinkCopy inviteToken={invite.token} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        resendInvite.mutate({
                          workspaceId: workspace.id,
                          inviteId: invite.id,
                        })
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        revokeInvite.mutate({
                          workspaceId: workspace.id,
                          inviteId: invite.id,
                        })
                      }
                      className="text-xs text-destructive hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Profile and account security are managed from the user menu in the sidebar.{" "}
          <Link href={`/${workspace.slug}/inbox`} className="text-primary hover:underline">
            Back to app
          </Link>
        </p>
      </div>
    </div>
  );
}
