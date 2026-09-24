"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export type OperationToastTone = "success" | "error" | "warning" | "info";

export function OperationToast({ tone, title, description, id, clearParams = [], enabled = true }: {
  tone: OperationToastTone;
  title: string;
  description?: string;
  id?: string;
  clearParams?: readonly string[];
  enabled?: boolean;
}) {
  const clearParamsKey = clearParams.join("\0");

  useEffect(() => {
    if (!enabled) return;

    toast[tone](title, { description, id: id ?? `${tone}:${title}` });
    if (clearParamsKey) {
      const url = new URL(window.location.href);
      for (const parameter of clearParamsKey.split("\0")) url.searchParams.delete(parameter);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [clearParamsKey, description, enabled, id, title, tone]);
  return null;
}
