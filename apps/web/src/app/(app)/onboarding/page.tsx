"use client";

export const dynamic = "force-dynamic";

import { useState, useSyncExternalStore, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/provider";

type Step = 1 | 2;

export default function OnboardingPage() {
  const { user } = useUser();
  const { data: workspaces, isPending: workspacesLoading } = trpc.workspace.list.useQuery();
  const [existingWorkspaceRedirectFailed, setExistingWorkspaceRedirectFailed] = useState(false);

  /** Already in at least one workspace — refresh session cookie and skip create flow. */
  useEffect(() => {
    if (workspacesLoading || !workspaces?.length || existingWorkspaceRedirectFailed) return;
    void (async () => {
      const res = await fetch("/api/auth/set-onboarded", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        window.location.replace(`/${workspaces[0]!.slug}/inbox`);
      } else {
        setExistingWorkspaceRedirectFailed(true);
      }
    })();
  }, [workspaces, workspacesLoading, existingWorkspaceRedirectFailed]);

  const [step, setStep] = useState<Step>(1);
  const urlHost = useSyncExternalStore(
    () => () => {},
    () => window.location.host,
    () => "",
  );

  const computedDefault = user?.fullName ? `${user.fullName}'s Workspace` : "My Workspace";
  const [overrideName, setOverrideName] = useState<string | null>(null);
  const [overrideSlug, setOverrideSlug] = useState<string | null>(null);
  const workspaceName = overrideName ?? computedDefault;
  const slug = overrideSlug ?? generateSlug(workspaceName);

  const [error, setError] = useState("");

  const createWorkspace = trpc.workspace.create.useMutation();
  const completeOnboarding = trpc.workspace.completeOnboarding.useMutation();

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48);
  }

  function handleNameChange(value: string) {
    setOverrideName(value);
    setOverrideSlug(generateSlug(value));
  }

  async function handleFinish() {
    setError("");
    try {
      const workspace = await createWorkspace.mutateAsync({
        name: workspaceName,
        slug: slug || generateSlug(workspaceName),
      });
      await completeOnboarding.mutateAsync({ workspaceId: workspace.id });
      const setCookie = await fetch("/api/auth/set-onboarded", {
        method: "POST",
        credentials: "include",
      });
      if (!setCookie.ok) {
        throw new Error("Could not finish sign-in setup. Try again.");
      }
      window.location.assign(`/${workspace.slug}/inbox`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    }
  }

  const isLoading = createWorkspace.isPending || completeOnboarding.isPending;

  if (workspacesLoading || (workspaces && workspaces.length > 0 && !existingWorkspaceRedirectFailed)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-sm text-muted-foreground">
        Signing you in…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div className={`h-0.5 flex-1 mx-2 rounded ${s < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Workspace</span>
          <span>Confirm</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-card rounded-xl border border-border p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Create your workspace</h1>
              <p className="text-muted-foreground mt-1">Give your workspace a name and a unique URL.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Workspace name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Workspace URL</label>
                <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
                  <span className="px-3 py-2 text-xs sm:text-sm text-muted-foreground bg-muted border-r border-input shrink-0 max-w-[45%] truncate">
                    {urlHost ? `${urlHost}/` : "…/"}
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setOverrideSlug(generateSlug(e.target.value))}
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-transparent focus:outline-none"
                    placeholder="acme-corp"
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!workspaceName.trim() || !slug.trim()}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">You&apos;re all set</h1>
              <p className="text-muted-foreground mt-1">
                Your workspace <span className="font-medium text-foreground">{workspaceName}</span> will be ready at /
                <span className="font-medium text-foreground">{slug}</span>. Your profile comes from your sign-in provider.
              </p>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.fullName ?? "Avatar"} className="h-12 w-12 rounded-full" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                  {user?.firstName?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="min-w-0 text-left">
                <p className="font-medium truncate">{user?.fullName}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={isLoading}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Creating…" : "Get started"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
