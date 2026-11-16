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
      if (
        data.acionado &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
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
              if (
                "Notification" in window &&
                Notification.permission === "default"
              ) {
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
      <section className="tutor">
        <p className="tutor__marca">Fila Virtual</p>
        <p className="erro">{erro}</p>
      </section>
    );
  }

  if (!estado) {
    return (
      <section className="tutor">
        <p className="tutor__marca">Fila Virtual</p>
        <p>Carregando…</p>
      </section>
    );
  }

  const posicaoTexto = estado.posicao
    ? `${estado.posicao}º`
    : "—";

  return (
    <section className="tutor">
      <p className="tutor__marca">Sua vez na fila</p>
      <p className="tutor__codigo">{estado.codigo}</p>
      <p className="tutor__posicao">{posicaoTexto}</p>
      <p className="tutor__faixa">{estado.estimativa.texto}</p>
      <p className="tutor__criterio">{estado.criterio_texto}</p>
      {atualizando ? <p className="aviso">Atualizando fila…</p> : null}

      {estado.consentimento_pedido && !estado.ja_recusou ? (
        <div className="tutor__consentimento">
          <p>{estado.finalidade}</p>
          <div className="tutor__consentimento-acoes">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => void permitir()}
            >
              Permitir localização
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => void recusar()}
            >
              Recusar
            </button>
          </div>
        </div>
      ) : null}

      {estado.acionado && !estado.confirmado ? (
        <div className="tutor__acao">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void aCaminho()}
          >
            Estou a caminho
          </button>
        </div>
      ) : null}

      {estado.confirmado ? (
        <p className="tutor__confirmado">Confirmação registrada. Até já.</p>
      ) : null}
    </section>
  );
}
