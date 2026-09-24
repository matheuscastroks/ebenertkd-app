const replacements: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]"],
  [/(password|passwd|secret|token|api[_-]?key|authorization)(["'\s:=]+)([^\s,"'}]+)/gi, "$1$2[REDACTED]"],
  [/(session|userId|secret)=([^&\s]+)/gi, "$1=[REDACTED]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL REDACTED]"]
];

export function safeErrorMessage(error: unknown, fallback = "unexpected_error") {
  const original = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  return replacements.reduce((message, [pattern, replacement]) => message.replace(pattern, replacement), original)
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240) || fallback;
}
