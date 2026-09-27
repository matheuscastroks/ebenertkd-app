"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// In React 19 / Next.js 16, rendering an inline script tag inside a component triggers
// a development console.error warning ("Encountered a script tag while rendering React component").
// next-themes uses this inline script to prevent FOUC (flash of unstyled content).
// We suppress this specific false positive so Next.js's error overlay is not triggered.
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
