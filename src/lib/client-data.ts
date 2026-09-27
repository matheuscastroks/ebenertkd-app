/**
 * Appwrite SDK rows can have a custom prototype or class instances.
 * React Server Components only accept plain objects and supported built-ins
 * (like Map, Set) at a client-component boundary.
 */
export function toClientData<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (value instanceof Map) {
    const plainMap = new Map();
    for (const [k, v] of value.entries()) {
      plainMap.set(k, toClientData(v));
    }
    return plainMap as unknown as T;
  }

  if (value instanceof Set) {
    const plainSet = new Set();
    for (const item of value) {
      plainSet.add(toClientData(item));
    }
    return plainSet as unknown as T;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}
