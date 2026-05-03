export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      <div className="p-6 max-w-2xl space-y-8">
        <section>
          <h2 className="text-base font-semibold mb-4">General</h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Workspace name</p>
                <p className="text-sm text-muted-foreground">The display name for this workspace</p>
              </div>
              <button className="text-sm text-primary hover:underline">Edit</button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Members</p>
                <p className="text-sm text-muted-foreground">Invite people to your workspace</p>
              </div>
              <button className="text-sm text-primary hover:underline">Manage</button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Billing</p>
                <p className="text-sm text-muted-foreground">Manage your subscription and plan</p>
              </div>
              <button className="text-sm text-primary hover:underline">View</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
