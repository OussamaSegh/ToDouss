"use client";

import { cn } from "@todouss/ui";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-5", className)}>{children}</div>;
}
