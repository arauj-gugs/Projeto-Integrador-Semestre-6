/** Lista de origens permitidas + previews `*.vercel.app` quando `CORS_ORIGIN` está definido. */
export function configurarCorsOrigin():
  | boolean
  | string[]
  | ((origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => void) {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return false;
  }
  const lista = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lista.length === 0) {
    return false;
  }
  if (lista.includes("*")) {
    return true;
  }
  return (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (lista.includes(origin)) {
      cb(null, true);
      return;
    }
    try {
      const host = new URL(origin).hostname;
      if (host.endsWith(".vercel.app")) {
        cb(null, true);
        return;
      }
    } catch {
      /* ignore */
    }
    cb(null, false);
  };
}