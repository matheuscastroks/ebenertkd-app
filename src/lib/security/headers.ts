export type SecurityHeader = { key: string; value: string };

export function securityHeaders(production: boolean, appwriteEndpoint = "https://fra.cloud.appwrite.io/v1"): SecurityHeader[] {
  const endpoint = new URL(appwriteEndpoint);
  const websocketOrigin = `${endpoint.protocol === "https:" ? "wss:" : "ws:"}//${endpoint.host}`;
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${endpoint.origin} ${websocketOrigin}`,
    "script-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ].join("; ");
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: policy },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
  ];
  if (production) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  return headers;
}
