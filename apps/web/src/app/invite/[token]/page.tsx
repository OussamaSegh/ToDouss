"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAcceptInvite } from "@/hooks/use-invite-mutations";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const acceptInvite = useAcceptInvite();
  const token = params.token;

  useEffect(() => {
    if (!token) return;
    acceptInvite.mutate(
      { token },
      {
        onSuccess: (data) => {
          router.replace(`/${data.workspaceSlug}/inbox`);
        },
      },
    );
  }, [token, acceptInvite, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-base font-medium">Accepting invite...</p>
        {acceptInvite.isError && (
          <p className="mt-2 text-sm text-destructive">
            {acceptInvite.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
