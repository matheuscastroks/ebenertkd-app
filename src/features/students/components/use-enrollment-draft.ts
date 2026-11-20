"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const fields = new Set(["full_name", "cpf", "birth_date", "whatsapp", "guardian_contact", "address", "address_street", "address_number", "address_complement", "address_neighborhood", "address_city", "address_state", "address_cep", "emergency_contact_name", "emergency_contact_relationship", "emergency_contact_phone", "started_at_tkd", "rank_key", "sex", "training_class_id", "health_condition", "health_details", "medications", "allergies", "injuries", "requested_due_day"]);
const changeEvent = "enrollment-draft:changed";
const serverSnapshot = () => null;
const safeValues = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([name, value]) => fields.has(name) && typeof value === "string")) as Record<string, string>;

export function useEnrollmentDraft(key: string) {
  const storageKey = `enrollment-draft:${key}`;
  const [failureKey, setFailureKey] = useState<string | null>(null);
  const subscribe = useCallback((notify: () => void) => {
    const update = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== null && event.key !== storageKey) return;
      if (event instanceof CustomEvent && event.detail !== storageKey) return;
      notify();
    };
    window.addEventListener("storage", update);
    window.addEventListener(changeEvent, update);
    return () => { window.removeEventListener("storage", update); window.removeEventListener(changeEvent, update); };
  }, [storageKey]);
  const getSnapshot = useCallback(() => {
    try { return localStorage.getItem(storageKey) ?? ""; }
    catch { return ""; }
  }, [storageKey]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const values = useMemo(() => {
    try {
      const stored: unknown = JSON.parse(snapshot || "{}");
      return stored && typeof stored === "object" && !Array.isArray(stored) ? safeValues(stored as Record<string, unknown>) : {};
    } catch { return {}; }
  }, [snapshot]);
  const save = (next: Record<string, string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(safeValues(next)));
      setFailureKey(null);
      window.dispatchEvent(new CustomEvent(changeEvent, { detail: storageKey }));
    } catch { setFailureKey(storageKey); }
  };
  const clear = () => {
    try { localStorage.removeItem(storageKey); window.dispatchEvent(new CustomEvent(changeEvent, { detail: storageKey })); }
    catch { /* A matrícula continua disponível sem armazenamento local. */ }
  };
  return { values, ready: snapshot !== null, saved: Boolean(snapshot) && failureKey !== storageKey, save, clear };
}
