export const DEFAULT_PREFERENCES: { announcements_enabled: boolean; financial_enabled: boolean; system_enabled: boolean };
export function pushAllowed(kind: string, preferences?: { announcements_enabled?: boolean | null; financial_enabled?: boolean | null; system_enabled?: boolean | null }): boolean;
export function isSafeActionUrl(value: unknown): boolean;
export const PUSH_TITLE: string;
export function pushPayload(notification: { $id: string; action_url?: string | null }): { title: string; body: string; url: string; tag: string };
