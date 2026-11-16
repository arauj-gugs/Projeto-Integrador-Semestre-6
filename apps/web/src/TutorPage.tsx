import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useFilaStream } from "./useFilaStream";

type TutorEstado = {
  id: string;
  codigo: string;
  posicao: number | null;
  estimativa: { p50: number; p90: number; texto: string };
  criterio: string;
  criterio_texto: string;
  consentimento_pedido: boolean;
  ja_recusou: boolean;
  acionado: boolean;
  confirmado: boolean;
  finalidade: string;
};

export function TutorPage({ token }: { token: string }) {
  const { atualizando } = useFilaStream();
  const [estado, setEstado] = useState<TutorEstado | null>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api<TutorEstado>(`/tutor/${token}`);
      setEstado(data);
      setErro("");
      if (data.acionado && "Notification" in window && Notification.permission === "granted") {
        new Notification("Fila Virtual", { body: "Hora de voltar à clínica" });
      }
    } catch (err) {
      const status = (err as { status?: number }).status;
      setErro(
        status === 401
          ? "Este link não é mais válido. Procure a recepção."
          : "Não foi possível carregar o atendimento",
      );
    }
  }, [token]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 15_000);
    return () => clearInterval(t);
  }, [carregar]);

  async function permitir() {
    if (!estado) return;
    setBusy(true);
    try {
      if (!navigator.geolocation) {
        await recusar();
        return;
      }
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await api(`/atendimentos/${estado.id}/localizacao`, {
                method: "POST",
                body: JSON.stringify({
                  momento: "entrada",
                  consentimento: { concedido: true },
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                }),
              });
              if ("Notification" in window && Notification.permission === "default") {
                await Notification.requestPermission();
              }
              await carregar();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          async () => {
            await recusar();
            resolve();
          },
          { timeout: 15_000 },
        );
      });
    } finally {
      setBusy(false);
    }
  }

  async function recusar() {
    if (!estado) return;
    await api(`/atendimentos/${estado.id}/localizacao`, {
      method: "POST",
      body: JSON.stringify({
        momento: "entrada",
        consentimento: { concedido: false },
        recusou: true,
      }),
    });
    await carregar();
  }

  async function aCaminho() {
    if (!estado) return;
    setBusy(true);
    try {
      await api(`/atendimentos/${estado.id}/confirmar-deslocamento`, {
        method: "POST",
      });
      await carregar();
    } finally {
      setBusy(false);
    }
  }

  if (erro) {
    return (
      <main className="tutor">
        <p className="erro">{erro}</p>
      </main>
    );
  }

  if (!estado) {
    return (
      <main className="tutor">
        <p>Carregando…</p>
      </main>
    );
  }

  return (
    <main className="tutor">
      <h1>Fila Virtual</h1>
      <p className="codigo">{estado.codigo}</p>
      <p className="posicao">
        {estado.posicao ? `${estado.posicao}º na fila` : "Aguardando"}
      </p>
      <p className="faixa">{estado.estimativa.texto}</p>
      <p>{estado.criterio_texto}</p>
      {atualizando ? <p className="aviso">Atualizando fila…</p> : null}

      {estado.consentimento_pedido && !estado.ja_recusou ? (
        <div className="card">
          <p>{estado.finalidade}</p>
          <button type="button" disabled={busy} onClick={() => void permitir()}>
            Permitir localização
          </button>
          <button type="button" disabled={busy} onClick={() => void recusar()}>
            Recusar
          </button>
        </div>
      ) : null}

      {estado.acionado && !estado.confirmado ? (
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => void aCaminho()}
        >
          Estou a caminho
        </button>
      ) : null}

      {estado.confirmado ? <p>Confirmação registrada. Até já.</p> : null}
    </main>
  );
}
