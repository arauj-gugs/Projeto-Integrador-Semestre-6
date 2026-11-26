/** Base da API em produção (`VITE_API_URL`); vazio em dev usa o proxy do Vite. */
const raw = import.meta.env.VITE_API_URL?.trim() ?? "";

export const apiBase = raw.replace(/\/$/, "");

export function urlApi(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return apiBase ? `${apiBase}${p}` : p;
}