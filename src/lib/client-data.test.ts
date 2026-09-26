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
});
