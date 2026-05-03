export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";
export type Plan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  plan: Plan;
  storageUsed: number;
  createdAt: Date;
  updatedAt: Date;
  role?: WorkspaceRole | undefined;
}

export interface ProjectData {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: ProjectStatus;
  isPrivate: boolean;
  isInbox: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
}
