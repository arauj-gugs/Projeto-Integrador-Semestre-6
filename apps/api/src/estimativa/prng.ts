/** Gerador determinístico mulberry32 — o mesmo da planilha de referência. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentil empírico por posto: posição `ceil(p * N) - 1` da lista ordenada. */
export function percentilPorPosto(ordenado: number[], p: number): number {
  if (ordenado.length === 0) {
    throw new Error("percentilPorPosto: lista vazia");
  }
  const indice = Math.ceil(p * ordenado.length) - 1;
  const valor = ordenado[Math.max(0, Math.min(indice, ordenado.length - 1))];
  if (valor === undefined) {
    throw new Error("percentilPorPosto: índice inválido");
  }
  return valor;
}

export function amostrar(pool: number[], random: () => number): number {
  if (pool.length === 0) {
    throw new Error("amostrar: pool vazio");
  }
  const indice = Math.floor(random() * pool.length);
  const valor = pool[indice];
  if (valor === undefined) {
    throw new Error("amostrar: índice inválido");
  }
  return valor;
}
