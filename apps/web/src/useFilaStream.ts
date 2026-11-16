import { useEffect, useRef, useState } from "react";

export type SnapshotFila = {
  versao: number;
  emitted_at: string;
  recursos: {
    veterinario: "livre" | "ocupado";
    salaIsolamento: "livre" | "ocupado";
  };
  cabecas: Array<{
    chave: string;
    id: string;
    codigo: string;
    especie: string;
    risco: string;
    estado: string;
    emergencia: boolean;
  }>;
  filas: Record<
    string,
    Array<{
      id: string;
      codigo: string;
      especie: string;
      risco: string;
      posicao: number;
      emergencia: boolean;
      estado: string;
    }>
  >;
  em_atendimento: { id: string; codigo: string } | null;
  alertas: Array<{ codigo: string; mensagem: string }>;
};

const POLLING_MS = 15_000;

export function useFilaStream() {
  const [snapshot, setSnapshot] = useState<SnapshotFila | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    async function poll() {
      setAtualizando(true);
      try {
        const res = await fetch("/fila/estado");
        if (!res.ok) return;
        const data = (await res.json()) as SnapshotFila;
        if (!cancelled) setSnapshot(data);
      } finally {
        if (!cancelled) setAtualizando(false);
      }
    }

    function conectar() {
      const es = new EventSource("/fila/stream");
      esRef.current = es;
      es.addEventListener("fila-atualizada", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SnapshotFila;
          setSnapshot(data);
          setAtualizando(false);
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        es.close();
        esRef.current = null;
        setAtualizando(true);
        void poll();
        pollTimer = setInterval(() => void poll(), POLLING_MS);
        setTimeout(() => {
          if (cancelled) return;
          if (pollTimer) clearInterval(pollTimer);
          conectar();
        }, POLLING_MS);
      };
    }

    conectar();
    return () => {
      cancelled = true;
      esRef.current?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  return { snapshot, atualizando };
}
