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

const WEBHOOK_EVENTS = [{ id: "task.completed", label: "Task completed" }] as const;

function IntegrationsSection() {
  const workspace = useWorkspace();
  const utils = trpc.useUtils();
  const canManage = workspace.role === "OWNER" || workspace.role === "ADMIN";

  const [apiKeyName, setApiKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [keyCopiedTick, setKeyCopiedTick] = useState(false);

  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(() => [WEBHOOK_EVENTS[0]?.id ?? "task.completed"]);
  const [revealedHookSecret, setRevealedHookSecret] = useState<string | null>(null);
  const [secretCopiedTick, setSecretCopiedTick] = useState(false);

  const { data: apiKeys, isLoading: keysLoading } = trpc.apiKey.list.useQuery(
    { workspaceId: workspace.id },
    { enabled: canManage },
  );
  const { data: webhooks, isLoading: hooksLoading } = trpc.workspaceWebhook.list.useQuery(
    { workspaceId: workspace.id },
    { enabled: canManage },
  );

  const createKey = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      void utils.apiKey.list.invalidate({ workspaceId: workspace.id });
      setRevealedKey(data.key);
      setApiKeyName("");
    },
  });
  const revokeKey = trpc.apiKey.revoke.useMutation({
    onSuccess: () => void utils.apiKey.list.invalidate({ workspaceId: workspace.id }),
  });

  const createHook = trpc.workspaceWebhook.create.useMutation({
    onSuccess: (data) => {
      void utils.workspaceWebhook.list.invalidate({ workspaceId: workspace.id });
      setRevealedHookSecret(data.secret);
      setHookUrl("");
      setHookEvents([WEBHOOK_EVENTS[0]?.id ?? "task.completed"]);
    },
  });
  const deleteHook = trpc.workspaceWebhook.delete.useMutation({
    onSuccess: () => void utils.workspaceWebhook.list.invalidate({ workspaceId: workspace.id }),
  });

  async function copy(key: string, kind: "key" | "secret") {
    try {
      await navigator.clipboard.writeText(key);
      if (kind === "key") {
        setKeyCopiedTick(true);
        setTimeout(() => setKeyCopiedTick(false), 2000);
      } else {
        setSecretCopiedTick(true);
        setTimeout(() => setSecretCopiedTick(false), 2000);
      }
    } catch {
      /* ignore */
    }
  }

  if (!canManage) {
    return (
      <section>
        <h2 className="mb-4 text-base font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Only admins can create API keys and workspace webhooks.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Integrations</h2>
      <p className="text-sm text-muted-foreground mb-4">
        REST access uses Bearer tokens you create here. Outbound webhooks receive JSON POSTs with an{" "}
        <span className="font-mono text-xs">X-ToDouss-Signature</span> HMAC (sha256 hex of the body).
      </p>

      <div className="rounded-lg border border-border p-4 space-y-3 mb-6">
        <p className="text-sm font-medium">REST API</p>
        <p className="text-xs text-muted-foreground">
          Base URL <span className="font-mono">/api/v1/tasks</span> — send header{" "}
          <span className="font-mono">Authorization: Bearer td_live_…</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={apiKeyName}
            onChange={(e) => setApiKeyName(e.target.value)}
            placeholder="Key label (e.g. CI, Zapier)"
            className="flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <UiButton
            type="button"
            size="sm"
            variant="primary"
            disabled={!apiKeyName.trim() || createKey.isPending}
            onClick={() =>
              createKey.mutate({ workspaceId: workspace.id, name: apiKeyName.trim() })
            }
          >
            Create API key
          </UiButton>
        </div>
        {revealedKey ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
              Copy this key now — it is not shown again.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all flex-1">{revealedKey}</code>
              <button
                type="button"
                onClick={() => void copy(revealedKey, "key")}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                {keyCopiedTick ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {keyCopiedTick ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setRevealedKey(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {keysLoading ? (
          <p className="text-xs text-muted-foreground">Loading keys…</p>
        ) : (
          <ul className="space-y-1.5">
            {(apiKeys ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">No API keys yet.</li>
            ) : (
              (apiKeys ?? []).map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 px-2 py-1.5 text-xs"
                >
                  <span>
                    <span className="font-medium">{k.name}</span>
                    <span className="text-muted-foreground font-mono ml-2">{k.prefix}…</span>
                    {k.lastUsedAt ? (
                      <span className="text-muted-foreground ml-2">
                        last used {new Date(k.lastUsedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="text-destructive hover:underline shrink-0"
                    onClick={() => revokeKey.mutate({ workspaceId: workspace.id, apiKeyId: k.id })}
                  >
                    Revoke
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3 mb-6">
        <p className="text-sm font-medium">Outbound webhooks</p>
        <input
          value={hookUrl}
          onChange={(e) => setHookUrl(e.target.value)}
          placeholder="https://example.com/hooks/todouss"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-3 text-xs">
          {WEBHOOK_EVENTS.map((ev) => (
            <label key={ev.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={hookEvents.includes(ev.id)}
                onChange={(e) => {
                  setHookEvents((prev) =>
                    e.target.checked ? [...prev, ev.id] : prev.filter((x) => x !== ev.id),
                  );
                }}
              />
              {ev.label}
            </label>
          ))}
        </div>
        <UiButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={!hookUrl.trim() || hookEvents.length === 0 || createHook.isPending}
          onClick={() =>
            createHook.mutate({
              workspaceId: workspace.id,
              url: hookUrl.trim(),
              events: hookEvents,
            })
          }
        >
          Add webhook
        </UiButton>
        {revealedHookSecret ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
              Save this signing secret — it is not shown again.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all flex-1">{revealedHookSecret}</code>
              <button
                type="button"
                onClick={() => void copy(revealedHookSecret, "secret")}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                {secretCopiedTick ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {secretCopiedTick ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setRevealedHookSecret(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {hooksLoading ? (
          <p className="text-xs text-muted-foreground">Loading webhooks…</p>
        ) : (
          <ul className="space-y-1.5">
            {(webhooks ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">No webhooks yet.</li>
            ) : (
              (webhooks ?? []).map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0">
                    <span className="break-all font-mono">{h.url}</span>
                    <span className="text-muted-foreground block">
                      {h.events.join(", ")} · {h.isActive ? "active" : "paused"}
                      {typeof h.failCount === "number" && h.failCount > 0
                        ? ` · ${h.failCount} failed`
                        : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-destructive hover:underline shrink-0"
                    onClick={() =>
                      deleteHook.mutate({ workspaceId: workspace.id, webhookId: h.id })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function TeamsSection() {
  const workspace = useWorkspace();
  const utils = trpc.useUtils();
  const canManage = workspace.role === "OWNER" || workspace.role === "ADMIN";
  const [name, setName] = useState("");
  const { data: teams, isLoading } = trpc.team.list.useQuery({ workspaceId: workspace.id });
  const { data: members } = trpc.workspace.members.useQuery({ workspaceId: workspace.id });
  const { data: projects } = trpc.project.list.useQuery({ workspaceId: workspace.id });
  const createTeam = trpc.team.create.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      setName("");
    },
  });
  const deleteTeam = trpc.team.delete.useMutation({
    onSuccess: () => void utils.team.list.invalidate(),
  });
  const addMember = trpc.team.addMember.useMutation({
    onSuccess: () => void utils.team.list.invalidate(),
  });
  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => void utils.team.list.invalidate(),
  });
  const setProjectTeams = trpc.team.setProjectTeams.useMutation({
    onSuccess: () => void utils.team.list.invalidate(),
  });
  const [projectPick, setProjectPick] = useState("");
  const [teamPick, setTeamPick] = useState<string[]>([]);

  function syncTeamsForProject(pid: string) {
    const linked =
      teams
        ?.filter((t) => t.projects.some((pt) => pt.projectId === pid))
        .map((t) => t.id) ?? [];
    setTeamPick(linked);
  }

  if (!canManage) {
    return (
      <section>
        <h2 className="mb-4 text-base font-semibold">Teams</h2>
        <p className="text-sm text-muted-foreground">Only admins can manage teams and project access.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Teams &amp; project access</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Link teams to a project to limit who sees it. Projects with no team links stay visible to everyone in the
        workspace.
      </p>
      <div className="rounded-lg border border-border p-4 space-y-3 mb-6">
        <p className="text-sm font-medium">Create team</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Engineering"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <UiButton
            type="button"
            size="sm"
            variant="primary"
            disabled={!name.trim() || createTeam.isPending}
            onClick={() => createTeam.mutate({ workspaceId: workspace.id, name: name.trim() })}
          >
            Add
          </UiButton>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3 mb-6">
        <p className="text-sm font-medium">Restrict project to teams</p>
        <select
          value={projectPick}
          onChange={(e) => {
            const pid = e.target.value;
            setProjectPick(pid);
            if (pid) syncTeamsForProject(pid);
            else setTeamPick([]);
          }}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Select project…</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {(teams ?? []).map((t) => (
            <label key={t.id} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={teamPick.includes(t.id)}
                onChange={(e) => {
                  setTeamPick((prev) =>
                    e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                  );
                }}
              />
              {t.name}
            </label>
          ))}
        </div>
        <UiButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={!projectPick || setProjectTeams.isPending}
          onClick={() =>
            setProjectTeams.mutate({
              workspaceId: workspace.id,
              projectId: projectPick,
              teamIds: teamPick,
            })
          }
        >
          Save project teams
        </UiButton>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading teams…</p>
      ) : (
        <div className="space-y-4">
          {(teams ?? []).map((team) => (
            <div key={team.id} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-medium">{team.name}</p>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => deleteTeam.mutate({ workspaceId: workspace.id, teamId: team.id })}
                >
                  Delete
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Projects:{" "}
                {team.projects.length ? team.projects.map((pt) => pt.project.name).join(", ") : "—"}
              </p>
              <div className="space-y-1">
                {team.members.map((m) => (
                  <div key={m.id} className="flex justify-between text-xs">
                    <span>{m.member.user.name ?? m.member.user.email}</span>
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() =>
                        removeMember.mutate({
                          workspaceId: workspace.id,
                          teamId: team.id,
                          teamMemberId: m.id,
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <AddTeamMemberRow
                members={members ?? []}
                teamMemberWorkspaceMemberIds={new Set(team.members.map((m) => m.memberId))}
                onAdd={(workspaceMemberId) =>
                  addMember.mutate({
                    workspaceId: workspace.id,
                    teamId: team.id,
                    workspaceMemberId,
                  })
                }
                pending={addMember.isPending}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddTeamMemberRow({
  members,
  teamMemberWorkspaceMemberIds,
  onAdd,
  pending,
}: {
  members: Array<{ id: string; user: { email: string; name: string | null } }>;
  teamMemberWorkspaceMemberIds: Set<string>;
  onAdd: (workspaceMemberId: string) => void;
  pending: boolean;
}) {
  const [sel, setSel] = useState("");
  const options = members.filter((m) => !teamMemberWorkspaceMemberIds.has(m.id));
  return (
    <div className="flex gap-2 pt-2">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
      >
        <option value="">Add workspace member…</option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.user.name ?? m.user.email}
          </option>
        ))}
      </select>
      <UiButton
        type="button"
        size="sm"
        disabled={!sel || pending}
        onClick={() => {
          onAdd(sel);
          setSel("");
        }}
      >
        Add
      </UiButton>
    </div>
  );
}

export default function SettingsPage() {
  const workspace = useWorkspace();
  return <SettingsWorkspacePanels key={workspace.id} />;
}

function BillingPanel() {
  const workspace = useWorkspace();
  const { data, isLoading, error } = trpc.billing.summary.useQuery({
    workspaceId: workspace.id,
  });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const isOwner = workspace.role === "OWNER";

  async function startCheckout(plan: "PRO" | "BUSINESS") {
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, plan }),
      });
      const payload: unknown = await res.json();
      const url =
        typeof payload === "object" && payload !== null && "url" in payload
          ? (payload as { url?: string }).url
          : undefined;
      const errMsg =
        typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error?: string }).error)
          : null;
      if (!res.ok) {
        setCheckoutError(errMsg ?? "Checkout failed");
        return;
      }
      if (url) window.location.href = url;
    } catch {
      setCheckoutError("Checkout failed");
    }
  }

  async function openPortal() {
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      const payload: unknown = await res.json();
      const url =
        typeof payload === "object" && payload !== null && "url" in payload
          ? (payload as { url?: string }).url
          : undefined;
      const errMsg =
        typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error?: string }).error)
          : null;
      if (!res.ok) {
        setCheckoutError(errMsg ?? "Could not open billing portal");
        return;
      }
      if (url) window.location.href = url;
    } catch {
      setCheckoutError("Could not open billing portal");
    }
  }

  if (isLoading || error) {
    return (
      <p className="text-sm text-muted-foreground w-full sm:max-w-xs text-right">
        {error ? "Could not load billing." : "Loading billing…"}
      </p>
    );
  }
  if (!data) return null;

  const { limits, usage, plan, subscription } = data;
  const projectsCap =
    limits.maxActiveProjects == null ? "Unlimited" : `${usage.activeProjects} / ${limits.maxActiveProjects}`;
  const membersCap =
    limits.maxMembers == null ? "Unlimited" : `${usage.members} / ${limits.maxMembers}`;

  return (
    <div className="w-full sm:max-w-sm space-y-3 text-right sm:text-left">
      <p className="text-sm font-medium">
        Current plan: <span className="text-foreground">{plan}</span>
      </p>
      {subscription ? (
        <p className="text-xs text-muted-foreground">
          Subscription {subscription.status.toLowerCase()}
          {subscription.stripeCurrentPeriodEnd
            ? ` · Renews ${new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}`
            : ""}
          {subscription.cancelAtPeriodEnd ? " · Cancels at period end" : ""}
        </p>
      ) : null}
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>Projects: {projectsCap}</li>
        <li>Members: {membersCap}</li>
        <li>
          Storage: {usage.storageUsedLabel}
          {limits.maxStorageBytes != null ? ` / ${limits.storageLimitLabel}` : ""}
        </li>
      </ul>
      {checkoutError ? <p className="text-xs text-destructive">{checkoutError}</p> : null}
      {isOwner ? (
        <div className="flex flex-wrap gap-2 justify-end sm:justify-start">
          {plan === "FREE" ? (
            <>
              <UiButton type="button" size="sm" variant="primary" onClick={() => void startCheckout("PRO")}>
                Upgrade to Pro
              </UiButton>
              <UiButton type="button" size="sm" variant="secondary" onClick={() => void startCheckout("BUSINESS")}>
                Business
              </UiButton>
            </>
          ) : null}
          {subscription?.hasStripeCustomer ? (
            <UiButton type="button" size="sm" variant="secondary" onClick={() => void openPortal()}>
              Manage subscription
            </UiButton>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Ask a workspace owner to change billing.</p>
      )}
    </div>
  );
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
                <p className="text-sm font-medium">Plan &amp; billing</p>
                <p className="text-sm text-muted-foreground">
                  Usage limits, upgrades, and Stripe customer portal.
                </p>
              </div>
              <BillingPanel />
            </div>
          </div>
        </section>

        <IntegrationsSection />

        <TeamsSection />

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
