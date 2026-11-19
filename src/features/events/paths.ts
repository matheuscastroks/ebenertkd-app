import { ROUTES } from "@/lib/navigation/routes";

/**
 * Destino de volta das actions de inscrição. Só caminhos internos de eventos são aceitos, para que um
 * formulário adulterado não vire redirecionamento aberto.
 */
export function safeEventReturnPath(value: FormDataEntryValue | null | undefined, fallback: string = ROUTES.studentEvents) {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("?") || path.includes("#")) return fallback;
  const allowed = [ROUTES.studentEvents, ROUTES.adminEvents, `${ROUTES.guardianDependents}/`];
  const ok = allowed.some((prefix) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
  if (!ok) return fallback;
  if (path.startsWith(`${ROUTES.guardianDependents}/`) && !/^\/responsavel\/dependentes\/[^/]+\/eventos$/.test(path)) return fallback;
  return path;
}

export function withQuery(path: string, params: Record<string, string>) {
  return `${path}?${new URLSearchParams(params).toString()}`;
}
