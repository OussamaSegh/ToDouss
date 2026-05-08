"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { UiButton } from "@todouss/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[95] rounded-lg border border-border bg-card p-2 shadow-md">
      <UiButton size="sm" variant="primary" onClick={() => void handleInstall()}>
        <Download className="h-3.5 w-3.5" />
        Install app
      </UiButton>
    </div>
  );
}

