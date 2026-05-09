/**
 * Plan limits — single source for UI and server enforcement.
 * Aligns with Prisma `Plan` enum on `Workspace`.
 */
export const BILLING_PLANS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export interface PlanLimits {
  /** Max active projects (null = unlimited). Inbox counts as a project. */
  maxActiveProjects: number | null;
  /** Max workspace members including owner (null = unlimited). */
  maxMembers: number | null;
  /** Max total attachment bytes (null = unlimited). */
  maxStorageBytes: number | null;
}

const FREE: PlanLimits = {
  maxActiveProjects: 5,
  maxMembers: 2,
  maxStorageBytes: 100 * 1024 * 1024,
};

const PRO: PlanLimits = {
  maxActiveProjects: null,
  maxMembers: null,
  maxStorageBytes: 5 * 1024 * 1024 * 1024,
};

const UNLIMITED: PlanLimits = {
  maxActiveProjects: null,
  maxMembers: null,
  maxStorageBytes: null,
};

export function getPlanLimits(plan: string): PlanLimits {
  switch (plan) {
    case "PRO":
      return PRO;
    case "BUSINESS":
    case "ENTERPRISE":
      return UNLIMITED;
    case "FREE":
    default:
      return FREE;
  }
}

export function formatStorageLimit(bytes: number | null): string {
  if (bytes == null) return "Unlimited";
  if (bytes >= 1024 * 1024 * 1024) return `${bytes / (1024 * 1024 * 1024)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
