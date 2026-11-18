import { revalidateTag, updateTag } from "next/cache";

/**
 * Invalida tags depois de uma gravação. Em Server Action usa `updateTag` (o autor já vê o dado novo);
 * fora dela (rota, job) cai para `revalidateTag` com expiração imediata. Nunca lança: uma gravação
 * que deu certo não pode falhar por causa do cache.
 */
export function invalidateTags(...tags: Array<string | false | null | undefined>) {
  for (const tag of new Set(tags.filter((item): item is string => Boolean(item)))) {
    try {
      updateTag(tag);
    } catch {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Fora do runtime do Next (testes, scripts): não há cache para invalidar.
      }
    }
  }
}
