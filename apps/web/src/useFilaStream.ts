import { useCallback, useEffect, useRef, useState } from "react";

export type ItemFilaSnapshot = {
  id: string;
  codigo: string;
  especie: string;
  risco: string;
  posicao: number;
  emergencia: boolean;
  estado: string;
  tipo: string | null;
  criado_em: string | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  animal_nome: string | null;
  tutor_nome: string | null;
};

export type EmAtendimentoItem = {
  id: string;
  codigo: string;
  especie?: string;
  tipo: string | null;
  inicio_real: string | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  animal_nome: string | null;
  tutor_nome: string | null;
};

export type SnapshotFila = {
  versao: number;
  emitted_at: string;
  recursos: {
    veterinario: "livre" | "ocupado";
    salaIsolamento: "livre" | "ocupado";
  };
  capacidades: { caes: number; outros: number };
  cabecas: Array<{
    chave: string;
    id: string;
    codigo: string;
    especie: string;
    risco: string;
    estado: string;
    emergencia: boolean;
    tipo: string | null;
    criado_em: string | null;
    espera_atual_p50: number | null;
    espera_atual_p90: number | null;
    animal_nome: string | null;
    tutor_nome: string | null;
  }>;
  filas: Record<string, ItemFilaSnapshot[]>;
  em_atendimento: {
    caes: EmAtendimentoItem[];
    outros: EmAtendimentoItem[];
  };
  alertas: Array<{ codigo: string; mensagem: string }>;
};

/** Backup enquanto o SSE não entrega (RNF-02 ≤ 5 s). */
const POLLING_MS = 5_000;

export function useFilaStream() {
  const [snapshot, setSnapshot] = useState<SnapshotFila | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const cancelledRef = useRef(false);

  const recarregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const res = await fetch("/fila/estado");
      if (!res.ok) return;
      const data = (await res.json()) as SnapshotFila;
      if (!cancelledRef.current) setSnapshot(data);
    } finally {
      if (!cancelledRef.current) setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    void recarregar();
    pollTimer = setInterval(() => void recarregar(), POLLING_MS);

    function conectar() {
      const es = new EventSource("/fila/stream");
      esRef.current = es;
      es.addEventListener("fila-atualizada", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SnapshotFila;
          if (!cancelledRef.current) {
            setSnapshot(data);
            setAtualizando(false);
          }
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        es.close();
        esRef.current = null;
        void recarregar();
        reconnectTimer = setTimeout(() => {
          if (cancelledRef.current) return;
          conectar();
        }, POLLING_MS);
      };
    }

    conectar();
    return () => {
      cancelledRef.current = true;
      esRef.current?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [recarregar]);

  return { snapshot, atualizando, recarregar };
}
