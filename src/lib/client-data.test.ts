import { describe, expect, it } from "vitest";
import { toClientData } from "./client-data";

class AppwriteLikeRow {
  $id = "row-1";
  value = "example";
}

describe("toClientData", () => {
  it("converts SDK-like rows into serializable plain objects", () => {
    const result = toClientData({ rows: [new AppwriteLikeRow()] });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(result.rows[0])).toBe(Object.prototype);
    expect(result).toEqual({ rows: [{ $id: "row-1", value: "example" }] });
  });

  it("preserves nullish values", () => {
    expect(toClientData(null)).toBeNull();
    expect(toClientData(undefined)).toBeUndefined();
  });

  it("handles Maps with Appwrite-like objects correctly", () => {
    const map = new Map<string, AppwriteLikeRow>([
      ["item-1", new AppwriteLikeRow()],
    ]);
    const result = toClientData(map);
    expect(result instanceof Map).toBe(true);
    const item = result.get("item-1");
    expect(item).toEqual({ $id: "row-1", value: "example" });
    expect(Object.getPrototypeOf(item)).toBe(Object.prototype);
  });
});
