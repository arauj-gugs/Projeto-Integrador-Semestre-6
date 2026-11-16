import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
  fila: { especie: string; risco: string; posicao: number; estado?: string };
  estimativa: { p50: number; p90: number };
  link_tutor: string;
};

type CampoErro = { campo?: string; mensagem: string };

type Animal = {
  id: string;
  tutorId: string;
  nome: string;
  especieFila: string;
  porte: string;
};

type Tutor = { id: string; nome: string };

type Agendamento = {
  id: string;
  animalId: string;
  tipo: string;
  inicioEm: string;
  duracaoMinutos: number;
  estado: string;
};

export function RecepcaoPage() {
  const { snapshot, atualizando } = useFilaStream();
  const [especie, setEspecie] = useState("cao");
  const [porte, setPorte] = useState("pequeno");
  const [tipo, setTipo] = useState<string>("consulta");
  const [marcadores, setMarcadores] = useState<string[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ultimo, setUltimo] = useState<IngressoResp | null>(null);
  const [msg, setMsg] = useState("");

  const [animais, setAnimais] = useState<Animal[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [animalId, setAnimalId] = useState("");
  const [tipoAnimal, setTipoAnimal] = useState<string>("consulta");
  const [marcadoresAnimal, setMarcadoresAnimal] = useState<string[]>([]);

  const carregarCadastro = useCallback(async () => {
    const perfil = { perfil: "recepcao" as const };
    const [a, t, g] = await Promise.all([
      api<Animal[]>("/animais", perfil),
      api<Tutor[]>("/tutores", perfil),
      api<Agendamento[]>("/agendamentos", perfil),
    ]);
    setAnimais(a);
    setTutores(t);
    setAgendamentos(g);
  }, []);

  useEffect(() => {
    void carregarCadastro().catch(() =>
      setMsg("Não foi possível carregar animais/agenda"),
    );
  }, [carregarCadastro]);

  const animaisWalkIn = useMemo(
    () => animais.filter((a) => a.porte !== "grande"),
    [animais],
  );

  useEffect(() => {
    if (
      animalId &&
      !animaisWalkIn.some((a) => a.id === animalId)
    ) {
      setAnimalId(animaisWalkIn[0]?.id ?? "");
      return;
    }
    if (!animalId && animaisWalkIn[0]) setAnimalId(animaisWalkIn[0].id);
  }, [animaisWalkIn, animalId]);
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

  const agendaPendentes = useMemo(
    () => agendamentos.filter((g) => g.estado === "marcado"),
    [agendamentos],
  );

  function nomeTutor(id: string): string {
    return tutores.find((t) => t.id === id)?.nome ?? "—";
  }

  function nomeAnimal(id: string): string {
    return animais.find((a) => a.id === id)?.nome ?? id.slice(0, 8);
  }

  function toggleMarcador(m: string) {
    setMarcadores((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function toggleMarcadorAnimal(m: string) {
    setMarcadoresAnimal((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function aplicarErros(err: unknown, fallback: string) {
    const body = (err as { body?: CampoErro[] }).body;
    if (Array.isArray(body)) {
      const mapa: Record<string, string> = {};
      for (const item of body) {
        if (item.campo) mapa[item.campo] = item.mensagem;
      }
      setErros(mapa);
    } else {
      setMsg(fallback);
    }
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
      aplicarErros(err, "Falha ao registrar ingresso");
    }
  }

  async function onIngressoAnimal(e: FormEvent) {
    e.preventDefault();
    setErros({});
    setMsg("");
    try {
      const body = await api<IngressoResp>(`/animais/${animalId}/atendimentos`, {
        method: "POST",
        perfil: "recepcao",
        body: JSON.stringify({
          tipo_atendimento: tipoAnimal,
          marcadores: marcadoresAnimal,
        }),
      });
      setUltimo(body);
      setMsg(
        `Ingresso ${body.codigo} (${nomeAnimal(animalId)}) na posição ${body.fila.posicao}`,
      );
    } catch (err) {
      aplicarErros(err, "Falha ao ingressar animal");
    }
  }

  async function onCheckIn(id: string) {
    setMsg("");
    try {
      const res = await api<{
        agendamento_id: string;
        atendimento: IngressoResp;
      }>(`/agendamentos/${id}/check-in`, {
        method: "POST",
        perfil: "recepcao",
      });
      setUltimo(res.atendimento);
      setMsg(`Check-in ${res.atendimento.codigo} (agenda)`);
      await carregarCadastro();
    } catch {
      setMsg("Falha no check-in da agenda");
    }
  }

  async function marcarSemLink(id: string) {
    await api(`/atendimentos/${id}/sem-link`, {
      method: "POST",
      perfil: "recepcao",
    });
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

      <form className="card" onSubmit={(e) => void onIngressoAnimal(e)}>
        <h3>Ingresso com animal cadastrado</h3>
        <p className="muted">Grandes só entram por check-in de agenda</p>
        <label>
          Animal
          <select
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
            required
          >
            {animaisWalkIn.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} · {a.especieFila} · {a.porte} · tutor{" "}
                {nomeTutor(a.tutorId)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            value={tipoAnimal}
            onChange={(e) => setTipoAnimal(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Marcadores</legend>
          {["reativo", "cio", "isolamento"].map((m) => (
            <label key={m} className="check">
              <input
                type="checkbox"
                checked={marcadoresAnimal.includes(m)}
                onChange={() => toggleMarcadorAnimal(m)}
              />
              {m}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={!animalId || animaisWalkIn.length === 0}>
          Colocar na fila
        </button>
        {erros.porte ? <span className="erro">{erros.porte}</span> : null}
      </form>

      <div className="card">
        <h3>Check-in de agenda</h3>
        {agendaPendentes.length === 0 ? (
          <p className="muted">Nenhum agendamento marcado</p>
        ) : (
          <ul>
            {agendaPendentes.map((g) => (
              <li key={g.id}>
                {nomeAnimal(g.animalId)} · {g.tipo} ·{" "}
                {new Date(g.inicioEm).toLocaleString()} · {g.duracaoMinutos} min{" "}
                <button type="button" onClick={() => void onCheckIn(g.id)}>
                  Check-in
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <h3>Novo ingresso (sem cadastro)</h3>
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
            {ultimo.fila.estado ? ` · ${ultimo.fila.estado}` : ""}
          </p>
          <p>
            Faixa p50–p90: {ultimo.estimativa.p50}–{ultimo.estimativa.p90} min
          </p>
          <p>
            Link: <a href={ultimo.link_tutor}>{ultimo.link_tutor}</a>
          </p>
          {qrUrl ? (
            <img src={qrUrl} alt="QR do link do tutor" width={160} height={160} />
          ) : null}
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
