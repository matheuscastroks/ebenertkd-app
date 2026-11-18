import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ unstableCache: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache, updateTag: mocks.updateTag, revalidateTag: mocks.revalidateTag }));

import { cachedRead } from "./cached-read";
import { invalidateTags } from "./invalidate";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.unstableCache.mockImplementation((load: () => Promise<unknown>) => () => load());
});

describe("cachedRead", () => {
  it("repassa nome, chave, tags e TTL ao unstable_cache", async () => {
    const result = await cachedRead({ name: "x", key: ["p1", { b: 2, a: 1 }], tags: ["t1", "t2"], revalidate: 60 }, async () => "ok");
    expect(result).toBe("ok");
    expect(mocks.unstableCache).toHaveBeenCalledWith(expect.any(Function), ["x", '"p1"', '{"a":1,"b":2}'], { tags: ["t1", "t2"], revalidate: 60 });
  });

  it("usuários diferentes geram chaves diferentes e a ordem das chaves do filtro não importa", () => {
    const keyOf = (id: string, filters: object) => {
      void cachedRead({ name: "n", key: [id, filters], tags: ["t"], revalidate: 10 }, async () => 1);
      return mocks.unstableCache.mock.calls.at(-1)![1] as string[];
    };
    expect(keyOf("a", { page: 1 })).not.toEqual(keyOf("b", { page: 1 }));
    expect(keyOf("a", { page: 1, q: "x" })).toEqual(keyOf("a", { q: "x", page: 1 }));
    expect(keyOf("a", { page: 1 })).not.toEqual(keyOf("a", { page: 2 }));
  });

  it("recusa leitura sem tags ou sem revalidate válido", () => {
    expect(() => cachedRead({ name: "x", key: [], tags: [], revalidate: 60 }, async () => 1)).toThrow("cached_read_tags_required");
    expect(() => cachedRead({ name: "x", key: [], tags: ["t"], revalidate: 0 }, async () => 1)).toThrow("cached_read_revalidate_required");
    expect(() => cachedRead({ name: "x", key: [], tags: ["t"], revalidate: Number.NaN }, async () => 1)).toThrow("cached_read_revalidate_required");
    expect(() => cachedRead({ name: " ", key: [], tags: ["t"], revalidate: 5 }, async () => 1)).toThrow("cached_read_name_required");
  });
});

describe("invalidateTags", () => {
  it("usa updateTag uma vez por tag e ignora valores vazios e repetidos", () => {
    invalidateTags("a", "b", "a", false, null, undefined);
    expect(mocks.updateTag.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("fora de Server Action cai para revalidateTag com expiração imediata", () => {
    mocks.updateTag.mockImplementation(() => { throw new Error("only server actions"); });
    invalidateTags("a");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("a", { expire: 0 });
  });

  it("nunca lança, mesmo sem runtime do Next", () => {
    mocks.updateTag.mockImplementation(() => { throw new Error("x"); });
    mocks.revalidateTag.mockImplementation(() => { throw new Error("y"); });
    expect(() => invalidateTags("a")).not.toThrow();
  });
});
