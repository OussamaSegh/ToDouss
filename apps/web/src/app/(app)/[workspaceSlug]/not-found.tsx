"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";

export default function WorkspaceNotFoundPage() {
  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Workspace unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This workspace doesn&apos;t exist or your account isn&apos;t a member anymore. Pick one of yours below or set up a new workspace.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your workspaces…</p>
      ) : (workspaces?.length ?? 0) > 0 ? (
        <ul className="flex max-w-md flex-col gap-2 text-left">
          {workspaces!.map((w) => (
            <li key={w.id}>
              <Link
                href={`/${w.slug}/inbox`}
                className="flex rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                {w.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href="/onboarding" className="text-primary hover:underline">
          Create workspace
        </Link>
        <Link href="/home" className="text-muted-foreground hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
