import { useState } from "react";
import { api } from "./api";
import { useFilaStream } from "./useFilaStream";

export function VeterinarioPage() {
  const { snapshot, atualizando } = useFilaStream();
  const [msg, setMsg] = useState("");
  const [inicioCurso, setInicioCurso] = useState<number | null>(null);

  const proximo = snapshot?.cabecas[0];
  const emCurso = snapshot?.em_atendimento;

  async function chamar() {
    setMsg("");
    try {
      const body = await api<{ id: string; codigo: string }>(
        "/atendimentos/chamar-proximo",
        { method: "POST", perfil: "veterinario" },
      );
      setInicioCurso(Date.now());
      setMsg(`Chamado ${body.codigo}`);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function emergencia(id: string) {
    await api(`/atendimentos/${id}/emergencia`, {
      method: "POST",
      perfil: "veterinario",
      body: JSON.stringify({ emergencia: true }),
    });
    setMsg("Emergência classificada");
  }

  async function encerrar(id: string) {
    // Duração mínima de 1 min (UC-05 E2); garante fim após o início real.
    const horario_fim = new Date(Date.now() + 60_000).toISOString();
    try {
      await api(`/atendimentos/${id}/encerrar`, {
        method: "POST",
        perfil: "veterinario",
        body: JSON.stringify({ horario_fim }),
      });
      setInicioCurso(null);
      setMsg("Atendimento encerrado");
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  const duracaoMin =
    inicioCurso && emCurso
      ? Math.max(0, Math.floor((Date.now() - inicioCurso) / 60_000))
      : null;

  return (
    <section className="page">
      <header className="page__header">
        <h2>Veterinário</h2>
        {atualizando ? <p className="aviso">Atualizando fila…</p> : null}
      </header>

      <div className="card">
        <h3>Próximo elegível</h3>
        {proximo ? (
          <>
            <p>
              {proximo.codigo} · {proximo.especie} · {proximo.risco}
              {proximo.emergencia ? " · EMERGÊNCIA" : ""}
            </p>
            <button type="button" onClick={() => void chamar()}>
              Chamar próximo
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => void emergencia(proximo.id)}
            >
              Classificar emergência
            </button>
          </>
        ) : (
          <p className="muted">Nenhum caso na cabeça das filas</p>
        )}
      </div>

      <div className="card">
        <h3>Em atendimento</h3>
        {emCurso ? (
          <>
            <p>
              {emCurso.codigo}
              {duracaoMin !== null ? ` · ${duracaoMin} min` : ""}
            </p>
            <button type="button" onClick={() => void encerrar(emCurso.id)}>
              Encerrar
            </button>
          </>
        ) : (
          <p className="muted">Nenhum atendimento em curso</p>
        )}
      </div>

      {msg ? <p>{msg}</p> : null}
    </section>
  );
}
