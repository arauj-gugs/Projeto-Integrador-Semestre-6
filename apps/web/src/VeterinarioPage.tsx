import { useEffect, useState } from "react";
import { api } from "./api";
import { rotuloEspecie, rotuloRisco, rotuloTipo } from "./rotulos";
import { useFilaStream, type EmAtendimentoItem } from "./useFilaStream";

function tituloCaso(item: {
  codigo: string;
  animal_nome?: string | null;
  tutor_nome?: string | null;
}): string {
  if (item.animal_nome && item.tutor_nome) {
    return `${item.animal_nome} · ${item.tutor_nome}`;
  }
  if (item.animal_nome) return item.animal_nome;
  return item.codigo;
}

export function VeterinarioPage() {
  const { snapshot, atualizando, recarregar } = useFilaStream();
  const [msg, setMsg] = useState("");
  const [inicioPorId, setInicioPorId] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);

  const proximo = snapshot?.cabecas[0];
  const emCaes = snapshot?.em_atendimento?.caes ?? [];
  const emOutros = snapshot?.em_atendimento?.outros ?? [];
  const capacidades = snapshot?.capacidades ?? { caes: 1, outros: 1 };
  const emCursoTodos = [...emCaes, ...emOutros];

  useEffect(() => {
    if (emCursoTodos.length === 0) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [emCursoTodos.length]);

  async function chamar(lane?: "caes" | "outros") {
    setMsg("");
    try {
      const body = await api<{ id: string; codigo: string }>(
        "/atendimentos/chamar-proximo",
        {
          method: "POST",
          perfil: "veterinario",
          body: JSON.stringify(lane ? { lane } : {}),
        },
      );
      setInicioPorId((prev) => ({ ...prev, [body.id]: Date.now() }));
      await recarregar();
      setMsg(`Chamado ${body.codigo}`);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function emergencia(id: string) {
    try {
      const res = await api<{ fila: { estado: string } }>(
        `/atendimentos/${id}/emergencia`,
        {
          method: "POST",
          perfil: "veterinario",
          body: JSON.stringify({ emergencia: true }),
        },
      );
      await recarregar();
      setMsg(
        res.fila.estado === "em_atendimento"
          ? "Emergência — animal em atendimento"
          : "Emergência classificada — espera recalculada",
      );
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function tirarDaFila(id: string) {
    try {
      await api(`/atendimentos/${id}/cancelar`, {
        method: "POST",
        perfil: "veterinario",
      });
      await recarregar();
      setMsg("Animal retirado da fila");
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function encerrar(id: string) {
    const horario_fim = new Date(Date.now() + 60_000).toISOString();
    try {
      await api(`/atendimentos/${id}/encerrar`, {
        method: "POST",
        perfil: "veterinario",
        body: JSON.stringify({ horario_fim }),
      });
      setInicioPorId((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await recarregar();
      setMsg("Atendimento encerrado");
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <h2>Veterinário</h2>
        <div className="page__meta">
          {atualizando ? <span className="aviso">Atualizando fila…</span> : null}
          <a href="#/recepcao">Ver painel da fila</a>
        </div>
      </header>

      {msg ? <p className="flash flash--ok">{msg}</p> : null}

      <div className="vet-grid">
        <div className="vet-painel">
          <p className="vet-painel__titulo">Próximo elegível</p>
          {proximo ? (
            <>
              <p className="vet-painel__codigo">{tituloCaso(proximo)}</p>
              <p className="vet-painel__meta">
                {proximo.codigo}
                {proximo.tipo ? ` · ${rotuloTipo(proximo.tipo)}` : ""} ·{" "}
                {rotuloEspecie(proximo.especie)} · {rotuloRisco(proximo.risco)}
                {proximo.emergencia ? (
                  <>
                    {" "}
                    <span className="badge badge--emergencia">Emergência</span>
                  </>
                ) : null}
              </p>
              <p className="vet-painel__meta">
                {proximo.espera_atual_p50 !== null &&
                proximo.espera_atual_p90 !== null
                  ? `Espera: entre ${proximo.espera_atual_p50} e ${proximo.espera_atual_p90} min`
                  : null}
              </p>
              <div className="vet-painel__acoes">
                <button
                  type="button"
                  className="primary"
                  onClick={() => void chamar()}
                >
                  Chamar próximo
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => void chamar("caes")}
                >
                  Chamar cães
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => void chamar("outros")}
                >
                  Chamar outros
                </button>
                {!proximo.emergencia ? (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void emergencia(proximo.id)}
                  >
                    Classificar emergência
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost"
                  onClick={() => void tirarDaFila(proximo.id)}
                >
                  Tirar da fila
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Nenhum caso na cabeça das filas</p>
          )}
        </div>

        <div className="vet-painel vet-painel--curso">
          <p className="vet-painel__titulo">
            Em atendimento · Cães ({emCaes.length}/{capacidades.caes})
          </p>
          <ListaEmCurso
            itens={emCaes}
            inicioPorId={inicioPorId}
            onEncerrar={encerrar}
          />
          <p className="vet-painel__titulo" style={{ marginTop: "1rem" }}>
            Em atendimento · Outros ({emOutros.length}/{capacidades.outros})
          </p>
          <ListaEmCurso
            itens={emOutros}
            inicioPorId={inicioPorId}
            onEncerrar={encerrar}
          />
        </div>
      </div>
    </section>
  );
}

function ListaEmCurso({
  itens,
  inicioPorId,
  onEncerrar,
}: {
  itens: EmAtendimentoItem[];
  inicioPorId: Record<string, number>;
  onEncerrar: (id: string) => void;
}) {
  if (itens.length === 0) {
    return <p className="muted">Nenhum</p>;
  }
  return (
    <ul className="em-curso__lista">
      {itens.map((emCurso) => {
        const inicio = inicioPorId[emCurso.id];
        const duracaoMin =
          inicio != null
            ? Math.max(0, Math.floor((Date.now() - inicio) / 60_000))
            : null;
        return (
          <li key={emCurso.id}>
            <p className="vet-painel__codigo">{tituloCaso(emCurso)}</p>
            <p className="vet-painel__meta">
              {emCurso.codigo}
              {emCurso.tipo ? ` · ${rotuloTipo(emCurso.tipo)}` : ""}
              {duracaoMin !== null
                ? ` · ${duracaoMin} min`
                : emCurso.inicio_real
                  ? ` · desde ${new Date(emCurso.inicio_real).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
            </p>
            <div className="vet-painel__acoes">
              <button
                type="button"
                className="primary"
                onClick={() => void onEncerrar(emCurso.id)}
              >
                Encerrar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
