/**
 * Appwrite SDK rows can have a custom prototype. React Server Components only
 * accept plain objects at a client-component boundary.
 */
export function toClientData<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
