/**
 * Extrai o hostname do header Host e diz se é loopback local.
 * Trata IPv6 com brackets: `[::1]:3000` → `::1` (split por `:` sozinho falha).
 */
export function hostnameDoHostHeader(
  hostHeader: string | undefined,
): string {
  const raw = (hostHeader ?? "").trim().toLowerCase();
  if (raw.startsWith("[")) {
    const fim = raw.indexOf("]");
    if (fim > 1) {
      return raw.slice(1, fim);
    }
  }
  return raw.split(":")[0] ?? "";
}

export function hostLocal(hostHeader: string | undefined): boolean {
  const host = hostnameDoHostHeader(hostHeader);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
