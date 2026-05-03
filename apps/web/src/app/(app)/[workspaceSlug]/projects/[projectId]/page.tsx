import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@todouss/db";
import { ListTodo } from "lucide-react";

interface ProjectPageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId, workspaceSlug } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        where: { isArchived: false, parentTaskId: null },
        orderBy: { sortOrder: "asc" },
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
      },
    },
  });

  if (!project) redirect(`/${workspaceSlug}/inbox`);

  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-sm"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold">{project.name}</h1>
        </div>
        {/* View switcher placeholder */}
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {["List", "Board", "Calendar", "Timeline", "Table"].map((view) => (
            <button
              key={view}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                view === "List"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto p-4">
        {project.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <ListTodo className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No tasks yet</p>
            <p className="text-sm text-muted-foreground/70">Add your first task to get started</p>
            <button className="mt-2 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Add task
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-0.5">
            {project.tasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
              >
                {/* Status checkbox */}
                <button
                  className={`h-4 w-4 rounded-full border-2 shrink-0 transition-colors ${
                    task.status === "DONE"
                      ? "bg-green-500 border-green-500"
                      : task.priority === "P1"
                        ? "border-red-500 hover:bg-red-50"
                        : task.priority === "P2"
                          ? "border-orange-500 hover:bg-orange-50"
                          : "border-muted-foreground/40 hover:border-primary"
                  }`}
                />

                {/* Title */}
                <span
                  className={`flex-1 text-sm ${
                    task.status === "DONE"
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {task.title}
                </span>

                {/* Meta */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {task._count.comments > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {task._count.comments} comment{task._count.comments !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Add task button */}
            <button className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors w-full mt-2">
              <span className="text-lg leading-none">+</span>
              Add task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
