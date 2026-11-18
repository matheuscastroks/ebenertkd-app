import "server-only";

import { unstable_cache } from "next/cache";

export type CachedReadOptions = {
  /** Nome estável da leitura (parte da chave). */
  name: string;
  /** TODOS os argumentos que mudam o resultado (ids, mês, filtros, página). */
  key: readonly unknown[];
  /** Tags usadas pelas gravações para invalidar. Obrigatório. */
  tags: readonly string[];
  /** TTL em segundos. Obrigatório. */
  revalidate: number;
};

function stable(value: unknown): string {
  if (value === undefined) return "undefined";
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : item
  );
}

/**
 * Única porta de entrada para `unstable_cache` no projeto (há um teste de guarda).
 * `load` usa o cliente admin e só enxerga ids/filtros serializáveis; nunca cookie, sessão
 * nem o perfil do ator. Autorização roda fora, antes de chamar isto.
 */
export function cachedRead<T>(options: CachedReadOptions, load: () => Promise<T>): Promise<T> {
  if (!options.name.trim()) throw new Error("cached_read_name_required");
  if (options.tags.length === 0 || options.tags.some((tag) => !tag.trim())) throw new Error("cached_read_tags_required");
  if (!Number.isFinite(options.revalidate) || options.revalidate <= 0) throw new Error("cached_read_revalidate_required");
  return unstable_cache(load, [options.name, ...options.key.map(stable)], { tags: [...options.tags], revalidate: options.revalidate })();
}
