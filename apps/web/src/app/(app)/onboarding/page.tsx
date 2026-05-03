"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/provider";

type Step = 1 | 2 | 3;

const TEMPLATES = [
  { id: "personal", label: "Personal", description: "Track personal tasks and goals", icon: "🏠" },
  { id: "work", label: "Work", description: "Manage work projects and deadlines", icon: "💼" },
  { id: "gtd", label: "GTD", description: "Getting Things Done methodology", icon: "✅" },
  { id: "dev", label: "Software Dev", description: "Sprint boards and engineering tasks", icon: "💻" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState<Step>(1);
  const [workspaceName, setWorkspaceName] = useState(user?.fullName ? `${user.fullName}'s Workspace` : "My Workspace");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("personal");
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
    setWorkspaceName(value);
    setSlug(generateSlug(value));
  }

  async function handleFinish() {
    setError("");
    try {
      const workspace = await createWorkspace.mutateAsync({
        name: workspaceName,
        slug: slug || generateSlug(workspaceName),
      });
      await completeOnboarding.mutateAsync({ workspaceId: workspace.id });
      // Update Clerk session to set onboarded = true
      await user?.reload();
      router.push(`/${workspace.slug}/inbox`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    }
  }

  const isLoading = createWorkspace.isPending || completeOnboarding.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-24 mx-1 transition-colors ${
                    s < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Workspace</span>
          <span>Profile</span>
          <span>Template</span>
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
                <label className="text-sm font-medium block mb-1.5">URL slug</label>
                <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
                  <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input">
                    todouss.com/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
                    placeholder="acme-corp"
                  />
                </div>
              </div>
            </div>
            <button
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
              <h1 className="text-2xl font-bold">Set up your profile</h1>
              <p className="text-muted-foreground mt-1">Your profile is pulled from your account. You can update it in settings.</p>
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
              <div>
                <p className="font-medium">{user?.fullName}</p>
                <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Choose a template</h1>
              <p className="text-muted-foreground mt-1">Start with a template that fits your workflow.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-colors ${
                    template === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={isLoading}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
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
