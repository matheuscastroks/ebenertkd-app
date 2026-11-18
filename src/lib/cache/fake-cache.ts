/**
 * Cache em memória para testes: imita `cachedRead` (chave + tags) e `invalidateTags`,
 * para provar que a invalidação por tag derruba a leitura certa e só ela.
 */
export function createFakeCache() {
  const store = new Map<string, { value: unknown; tags: string[] }>();
  const loads: string[] = [];
  return {
    loads,
    store,
    cachedRead: async <T>(options: { name: string; key: readonly unknown[]; tags: readonly string[]; revalidate: number }, load: () => Promise<T>): Promise<T> => {
      if (options.tags.length === 0 || !(options.revalidate > 0)) throw new Error("tags_and_revalidate_required");
      const id = JSON.stringify([options.name, ...options.key]);
      const hit = store.get(id);
      if (hit) return hit.value as T;
      loads.push(id);
      const value = await load();
      store.set(id, { value: JSON.parse(JSON.stringify(value ?? null)), tags: [...options.tags] });
      return JSON.parse(JSON.stringify(value ?? null)) as T;
    },
    invalidateTags: (...tags: Array<string | false | null | undefined>) => {
      for (const [id, entry] of store) if (entry.tags.some((tag) => tags.includes(tag))) store.delete(id);
    }
  };
}
