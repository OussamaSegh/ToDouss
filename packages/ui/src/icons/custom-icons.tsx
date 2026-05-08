import type { ReactElement, SVGProps } from "react";

export type CustomIconName = "workspace";

type CustomIconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

const WorkspaceIcon: CustomIconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17" />
    <path d="M8 4.5v15" />
  </svg>
);

export const CUSTOM_ICON_REGISTRY: Record<CustomIconName, CustomIconComponent> = {
  workspace: WorkspaceIcon,
};

