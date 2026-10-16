"use client";

import { Direction } from "radix-ui";
import type { ReactNode } from "react";

export function AppDirection({ children }: { children: ReactNode }) {
  return <Direction.Provider dir="rtl">{children}</Direction.Provider>;
}
