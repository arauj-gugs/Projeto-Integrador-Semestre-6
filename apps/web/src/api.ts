import { urlApi } from "./apiBase";

const JSON_HEADERS = { "content-type": "application/json" };

export async function api<T>(
  path: string,
  init?: RequestInit & { perfil?: "recepcao" | "veterinario" | "tutor" },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init?.perfil) {
    headers.set("x-perfil", init.perfil);
  }
  const res = await fetch(urlApi(path), { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw Object.assign(new Error(`Resposta invalida em ${path}`), {
        status: res.status,
        body: text.slice(0, 200),
      });
    }
  }
  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status}`), {
      status: res.status,
      body: data,
    });
  }
  return data as T;
}

export { JSON_HEADERS };
