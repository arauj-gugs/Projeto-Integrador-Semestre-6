import { useCallback, useEffect, useState } from "react";
import { urlApi } from "./apiBase";
import { TIPOS_ATENDIMENTO, rotuloTipo } from "./rotulos";

type HistoricoItem = {
  id: string;
  codigo: string;
  tipo: string;
  espera_prevista_p50: number;
  espera_prevista_p90: number;
  espera_realizada_minutos: number;
  duracao_minutos: number;
  erro_minutos: number;
  erro_absoluto_minutos: number;
  suspeita: boolean;
  encerrado_em: string;
};

type Indicador = {
  tipo: string;
  espera_prevista_media: number;
  espera_realizada_media: number;
  n: number;
};

type HistoricoDia = {
  dia: string;
  atendimentos: HistoricoItem[];
  erro_medio_absoluto: {
    geral: number | null;
    por_tipo: Record<string, number>;
  };
  indicadores?: Indicador[];
};

export function HistoricoPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [dia, setDia] = useState(hoje);
  const [tipo, setTipo] = useState("");
  const [dados, setDados] = useState<HistoricoDia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ dia });
      if (tipo) params.set("tipo", tipo);
      const res = await fetch(urlApi(`/historico?${params.toString()}`));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as HistoricoDia;
      setDados(json);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao carregar");
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }, [dia, tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const maxBarra = Math.max(
    1,
    ...(dados?.indicadores ?? []).flatMap((i) => [
      i.espera_prevista_media,
      i.espera_realizada_media,
    ]),
  );

  return (
    <section className="historico">
      <header className="page__header">
        <h2>Histórico do dia</h2>
      </header>

      <div className="filtros">
        <label>
          Dia
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
        </label>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_ATENDIMENTO.map((t) => (
              <option key={t} value={t}>
                {rotuloTipo(t)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void carregar()}>
          Atualizar
        </button>
      </div>

      {carregando ? <p className="muted">Carregando…</p> : null}
      {erro ? <p className="flash flash--erro">Erro: {erro}</p> : null}

      {dados ? (
        <>
          <div className="mae">
            <p className="mae__rotulo">
              Erro médio absoluto da espera (início real − início previsto)
            </p>
            <p className="mae__valor">
              {dados.erro_medio_absoluto.geral === null
                ? "—"
                : `${dados.erro_medio_absoluto.geral} min`}
            </p>
          </div>

          <h3>Atendimentos encerrados</h3>
          {dados.atendimentos.length === 0 ? (
            <p className="muted">Nenhum atendimento encerrado neste filtro.</p>
          ) : (
            <div className="tabela-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Espera prevista p50</th>
                    <th>Espera prevista p90</th>
                    <th>Espera realizada</th>
                    <th>Erro</th>
                    <th>|Erro|</th>
                    <th>Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.atendimentos.map((a) => (
                    <tr key={a.id}>
                      <td>{a.codigo}</td>
                      <td>{rotuloTipo(a.tipo)}</td>
                      <td>{a.espera_prevista_p50} min</td>
                      <td>{a.espera_prevista_p90} min</td>
                      <td>{a.espera_realizada_minutos} min</td>
                      <td>{a.erro_minutos} min</td>
                      <td>{a.erro_absoluto_minutos} min</td>
                      <td>{a.duracao_minutos} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>Espera prevista versus espera realizada por tipo</h3>
          <div className="barras" role="img" aria-label="Gráfico de barras">
            {(dados.indicadores ?? []).map((ind) => (
              <div key={ind.tipo} className="barra-grupo">
                <div className="barra-grupo__label">
                  {rotuloTipo(ind.tipo)} (n={ind.n})
                </div>
                <div className="barra-linha">
                  <span>prevista</span>
                  <div
                    className="barra barra--previsto"
                    style={{
                      width: `${(ind.espera_prevista_media / maxBarra) * 100}%`,
                    }}
                    title={`${ind.espera_prevista_media} min`}
                  />
                  <em>{ind.espera_prevista_media} min</em>
                </div>
                <div className="barra-linha">
                  <span>realizada</span>
                  <div
                    className="barra barra--realizado"
                    style={{
                      width: `${(ind.espera_realizada_media / maxBarra) * 100}%`,
                    }}
                    title={`${ind.espera_realizada_media} min`}
                  />
                  <em>{ind.espera_realizada_media} min</em>
                </div>
              </div>
            ))}
            {(dados.indicadores ?? []).length === 0 ? (
              <p className="muted">Sem indicadores para o filtro.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
