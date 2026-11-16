import { useMemo, useState, type FormEvent } from "react";
import { api } from "./api";
import { useFilaStream } from "./useFilaStream";

const TIPOS = [
  "consulta",
  "vacina",
  "ultrassom",
  "raio-x",
  "coleta",
  "castracao",
  "cirurgia",
  "emergencia",
] as const;

type IngressoResp = {
  id: string;
  codigo: string;
  fila: { especie: string; risco: string; posicao: number };
  estimativa: { p50: number; p90: number };
  link_tutor: string;
};

type CampoErro = { campo?: string; mensagem: string };

export function RecepcaoPage() {
  const { snapshot, atualizando } = useFilaStream();
  const [especie, setEspecie] = useState("cao");
  const [porte, setPorte] = useState("pequeno");
  const [tipo, setTipo] = useState<string>("consulta");
  const [marcadores, setMarcadores] = useState<string[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ultimo, setUltimo] = useState<IngressoResp | null>(null);
  const [msg, setMsg] = useState("");

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

  function toggleMarcador(m: string) {
    setMarcadores((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErros({});
    setMsg("");
    try {
      const body = await api<IngressoResp>("/atendimentos", {
        method: "POST",
        perfil: "recepcao",
        body: JSON.stringify({
          especie,
          porte,
          tipo_atendimento: tipo,
          marcadores,
        }),
      });
      setUltimo(body);
      setMsg(`Ingresso ${body.codigo} na posição ${body.fila.posicao}`);
    } catch (err) {
      const body = (err as { body?: CampoErro[] }).body;
      if (Array.isArray(body)) {
        const mapa: Record<string, string> = {};
        for (const item of body) {
          if (item.campo) mapa[item.campo] = item.mensagem;
        }
        setErros(mapa);
      } else {
        setMsg("Falha ao registrar ingresso");
      }
    }
  }

  async function marcarSemLink(id: string) {
    await api(`/atendimentos/${id}/sem-link`, { method: "POST", perfil: "recepcao" });
    setMsg("Marcado sem link");
  }

  const linkAbsoluto = ultimo
    ? `${window.location.origin}/${ultimo.link_tutor.replace(/^\//, "")}`
    : null;
  const qrUrl = linkAbsoluto
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(linkAbsoluto)}`
    : null;

  return (
    <section className="page">
      <header className="page__header">
        <h2>Recepção</h2>
        {atualizando ? <p className="aviso">Atualizando fila…</p> : null}
        <p>
          Sala isolamento:{" "}
          {snapshot?.recursos.salaIsolamento === "livre" ? "livre" : "ocupada"}
        </p>
      </header>

      {(snapshot?.alertas ?? []).length > 0 ? (
        <div className="alertas">
          {snapshot!.alertas.map((a) => (
            <p key={a.codigo + a.mensagem}>{a.mensagem}</p>
          ))}
        </div>
      ) : null}

      <form className="card" onSubmit={onSubmit}>
        <h3>Novo ingresso</h3>
        <label>
          Espécie
          <select value={especie} onChange={(e) => setEspecie(e.target.value)}>
            <option value="cao">Cão</option>
            <option value="gato">Gato</option>
            <option value="silvestre">Silvestre</option>
          </select>
          {erros.especie ? <span className="erro">{erros.especie}</span> : null}
        </label>
        <label>
          Porte
          <input value={porte} onChange={(e) => setPorte(e.target.value)} />
          {erros.porte ? <span className="erro">{erros.porte}</span> : null}
        </label>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {erros.tipo_atendimento ? (
            <span className="erro">{erros.tipo_atendimento}</span>
          ) : null}
        </label>
        <fieldset>
          <legend>Marcadores</legend>
          {["reativo", "cio", "isolamento"].map((m) => (
            <label key={m} className="check">
              <input
                type="checkbox"
                checked={marcadores.includes(m)}
                onChange={() => toggleMarcador(m)}
              />
              {m}
            </label>
          ))}
        </fieldset>
        <button type="submit">Registrar</button>
      </form>

      {ultimo ? (
        <div className="card">
          <h3>{ultimo.codigo}</h3>
          <p>
            Posição {ultimo.fila.posicao} · {ultimo.fila.especie}/
            {ultimo.fila.risco}
          </p>
          <p>
            Faixa p50–p90: {ultimo.estimativa.p50}–{ultimo.estimativa.p90} min
          </p>
          <p>
            Link: <a href={ultimo.link_tutor}>{ultimo.link_tutor}</a>
          </p>
          {qrUrl ? <img src={qrUrl} alt="QR do link do tutor" width={160} height={160} /> : null}
          <button type="button" onClick={() => void marcarSemLink(ultimo.id)}>
            Sem link
          </button>
        </div>
      ) : null}

      {msg ? <p>{msg}</p> : null}

      <div className="filas">
        <FilaColuna titulo="Cães" entradas={colunas.caes} />
        <FilaColuna titulo="Gatos" entradas={colunas.gatos} />
        <FilaColuna titulo="Silvestres" entradas={colunas.silvestres} />
        <FilaColuna titulo="Isolamento" entradas={colunas.isolamento} />
      </div>
    </section>
  );
}

function FilaColuna({
  titulo,
  entradas,
}: {
  titulo: string;
  entradas: [string, Array<{ codigo: string; posicao: number; risco: string }>][];
}) {
  return (
    <div className="card fila-col">
      <h3>{titulo}</h3>
      {entradas.length === 0 ? <p className="muted">Vazia</p> : null}
      {entradas.map(([chave, itens]) => (
        <div key={chave}>
          <p className="muted">{chave}</p>
          <ul>
            {itens.map((i) => (
              <li key={i.codigo}>
                {i.posicao}. {i.codigo} ({i.risco})
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
