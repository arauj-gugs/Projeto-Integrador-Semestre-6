import { useMemo } from "react";
import { rotuloRisco, rotuloTipo } from "./rotulos";
import { useFilaStream, type ItemFilaSnapshot } from "./useFilaStream";

function horaCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function faixaEspera(p50: number | null, p90: number | null): string {
  if (p50 === null || p90 === null) return "Estimativa indisponível";
  return `Entre ${p50} e ${p90} min`;
}

function tituloCaso(item: {
  codigo: string;
  animal_nome: string | null;
  tutor_nome: string | null;
}): string {
  if (item.animal_nome && item.tutor_nome) {
    return `${item.animal_nome} · ${item.tutor_nome}`;
  }
  if (item.animal_nome) return item.animal_nome;
  return item.codigo;
}

export function PainelTvPage() {
  const { snapshot, atualizando } = useFilaStream();

  const colunas = useMemo(() => {
    const filas = snapshot?.filas ?? {};
    return {
      caes: Object.entries(filas).filter(([k]) => k.startsWith("cao:")),
      gatos: Object.entries(filas).filter(([k]) => k.startsWith("gato:")),
      silvestres: Object.entries(filas).filter(([k]) =>
        k.startsWith("silvestre:"),
      ),
      isolamento: Object.entries(filas).filter(([k]) =>
        k.endsWith(":isolamento"),
      ),
    };
  }, [snapshot]);

  const emCaes = snapshot?.em_atendimento?.caes ?? [];
  const emOutros = snapshot?.em_atendimento?.outros ?? [];
  const capacidades = snapshot?.capacidades ?? { caes: 1, outros: 1 };
  const salaLivre = snapshot?.recursos.salaIsolamento === "livre";

  return (
    <div className="painel-tv">
      <header className="painel-tv__topo">
        <p className="painel-tv__marca">
          Fila Virtual
          <span>Sala de espera</span>
        </p>
        <div className="painel-tv__meta">
          {atualizando ? <span>Atualizando…</span> : null}
          <span>
            Isolamento:{" "}
            <span
              className={salaLivre ? "badge badge--livre" : "badge badge--ocupada"}
            >
              {salaLivre ? "livre" : "ocupada"}
            </span>
          </span>
        </div>
      </header>

      <div className="em-curso-grid em-curso-grid--tv">
        <PainelTvEmAtendimento
          titulo={`Em atendimento · Cães (${emCaes.length}/${capacidades.caes})`}
          itens={emCaes}
        />
        <PainelTvEmAtendimento
          titulo={`Em atendimento · Outros (${emOutros.length}/${capacidades.outros})`}
          itens={emOutros}
        />
      </div>

      <div className="filas filas--hospital filas--tv" aria-label="Filas">
        <ColunaTv titulo="Cães" variante="cao" entradas={colunas.caes} />
        <ColunaTv titulo="Gatos" variante="gato" entradas={colunas.gatos} />
        <ColunaTv
          titulo="Silvestres"
          variante="silvestre"
          entradas={colunas.silvestres}
        />
        <ColunaTv
          titulo="Isolamento"
          variante="isolamento"
          entradas={colunas.isolamento}
        />
      </div>
    </div>
  );
}

function PainelTvEmAtendimento({
  titulo,
  itens,
}: {
  titulo: string;
  itens: Array<{
    id: string;
    codigo: string;
    tipo: string | null;
    inicio_real: string | null;
    espera_atual_p50: number | null;
    espera_atual_p90: number | null;
    animal_nome: string | null;
    tutor_nome: string | null;
  }>;
}) {
  return (
    <div className="em-curso em-curso--tv">
      <p className="em-curso__rotulo">{titulo}</p>
      {itens.length === 0 ? (
        <p className="em-curso__nome em-curso__nome--vazio">
          Nenhum atendimento em curso
        </p>
      ) : (
        <ul className="em-curso__lista">
          {itens.map((emCurso) => (
            <li key={emCurso.id}>
              <p className="em-curso__nome">{tituloCaso(emCurso)}</p>
              <p className="em-curso__meta">
                {emCurso.codigo}
                {emCurso.tipo ? ` · ${rotuloTipo(emCurso.tipo)}` : ""}
                {" · começou "}
                {horaCurta(emCurso.inicio_real)}
                {" · "}
                {faixaEspera(
                  emCurso.espera_atual_p50,
                  emCurso.espera_atual_p90,
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ColunaTv({
  titulo,
  variante,
  entradas,
}: {
  titulo: string;
  variante: "cao" | "gato" | "silvestre" | "isolamento";
  entradas: [string, ItemFilaSnapshot[]][];
}) {
  const itens = entradas.flatMap(([, lista]) => lista);
  return (
    <div className={`fila-col fila-col--${variante}`}>
      <div className="fila-col__cabeca">
        {titulo}
        <span className="fila-col__count">{itens.length}</span>
      </div>
      <div className="fila-col__corpo">
        {itens.length === 0 ? <p className="muted">Vazia</p> : null}
        <ul className="fila-linhas">
          {itens.map((i) => (
            <li
              key={i.id}
              className={
                i.emergencia ? "fila-linha fila-linha--emergencia" : "fila-linha"
              }
            >
              <div className="fila-linha__topo">
                <span className="fila-linha__pos">{i.posicao}</span>
                <strong className="fila-linha__nome">{tituloCaso(i)}</strong>
                {i.emergencia ? (
                  <span className="badge badge--emergencia">Emergência</span>
                ) : null}
              </div>
              <p className="fila-linha__detalhe">
                {i.codigo}
                {i.tipo ? ` · ${rotuloTipo(i.tipo)}` : ""}
                {` · ${rotuloRisco(i.risco)}`}
              </p>
              <p className="fila-linha__tempo">
                Entrou {horaCurta(i.criado_em)} ·{" "}
                {faixaEspera(i.espera_atual_p50, i.espera_atual_p90)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
