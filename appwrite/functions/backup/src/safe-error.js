export function safeErrorMessage(error, fallback = "unexpected_error") {
  const original = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  return original
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/(password|passwd|secret|token|api[_-]?key|authorization)(["'\s:=]+)([^\s,"'}]+)/gi, "$1$2[REDACTED]")
    .replace(/(session|userId|secret)=([^&\s]+)/gi, "$1=[REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL REDACTED]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240) || fallback;
}
