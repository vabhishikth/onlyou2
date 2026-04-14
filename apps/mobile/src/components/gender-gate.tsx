import type { ReactNode } from "react";

import { useGender, type Gender } from "../hooks/use-gender";

export interface GenderGateProps {
  allow: Gender[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function GenderGate({
  allow,
  fallback = null,
  children,
}: GenderGateProps) {
  const gender = useGender();
  if (allow.includes(gender)) return <>{children}</>;
  return <>{fallback}</>;
}
