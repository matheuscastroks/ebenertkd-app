/** Aceita apenas caminhos internos: "/x", nunca "//host", "/\\host", URLs absolutas ou com quebras de linha. */
export function isSafeActionUrl(value: unknown): value is string {
  return typeof value === "string" && /^\/(?!\/)[^\\\r\n\t]*$/.test(value);
}

export function safeActionUrl(value: unknown, fallback = "/avisos") {
  return isSafeActionUrl(value) ? value : fallback;
}
