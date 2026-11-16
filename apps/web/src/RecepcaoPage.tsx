import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { api } from "./api";
import {
  OPCOES_ESPECIE,
  OPCOES_PORTE,
  TIPOS_ATENDIMENTO,
  rotuloEspecie,
  rotuloPorte,
  rotuloRisco,
  rotuloTipo,
} from "./rotulos";
import {
  useFilaStream,
  type EmAtendimentoItem,
  type ItemFilaSnapshot,
} from "./useFilaStream";

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

type Lane = "caes" | "outros";
type VarianteColuna = "cao" | "gato" | "silvestre" | "isolamento";

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

function especieDaColuna(variante: VarianteColuna): string {
  if (variante === "cao") return "cao";
  if (variante === "gato") return "gato";
  if (variante === "silvestre") return "silvestre";
  return "cao";
}

export function RecepcaoPage() {
  const { snapshot, atualizando, recarregar } = useFilaStream();
  const [especie, setEspecie] = useState("cao");
  const [porte, setPorte] = useState("pequeno");
  const [tipo, setTipo] = useState<string>("consulta");
  const [marcadores, setMarcadores] = useState<string[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ultimo, setUltimo] = useState<IngressoResp | null>(null);
  const [msg, setMsg] = useState("");
  const [erroCarga, setErroCarga] = useState("");
  const [ingressoAberto, setIngressoAberto] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [colunaAdd, setColunaAdd] = useState<VarianteColuna | null>(null);

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
      setErroCarga("Não foi possível carregar animais/agenda"),
    );
  }, [carregarCadastro]);

  const animaisWalkIn = useMemo(
    () => animais.filter((a) => a.porte !== "grande"),
    [animais],
  );

  useEffect(() => {
    if (animalId && !animaisWalkIn.some((a) => a.id === animalId)) {
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

  const capacidades = snapshot?.capacidades ?? { caes: 1, outros: 1 };
  const emCaes = snapshot?.em_atendimento?.caes ?? [];
  const emOutros = snapshot?.em_atendimento?.outros ?? [];

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
      setLinkCopiado(false);
      setMsg(`Ingresso ${body.codigo} na posição ${body.fila.posicao}`);
      await recarregar();
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
      setLinkCopiado(false);
      setMsg(
        `Ingresso ${body.codigo} (${nomeAnimal(animalId)}) na posição ${body.fila.posicao}`,
      );
      await recarregar();
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
      setLinkCopiado(false);
      setMsg(`Check-in ${res.atendimento.codigo} (agenda)`);
      await carregarCadastro();
      await recarregar();
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

  async function marcarEmergencia(id: string) {
    setBusyId(id);
    setMsg("");
    try {
      const res = await api<{
        fila: { estado: string };
      }>(`/atendimentos/${id}/emergencia`, {
        method: "POST",
        perfil: "recepcao",
        body: JSON.stringify({ emergencia: true }),
      });
      await recarregar();
      setMsg(
        res.fila.estado === "em_atendimento"
          ? "Emergência — animal em atendimento"
          : "Emergência marcada — priorizado na fila (sem vaga agora)",
      );
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function tirarDaFila(id: string) {
    setBusyId(id);
    setMsg("");
    try {
      await api(`/atendimentos/${id}/cancelar`, {
        method: "POST",
        perfil: "recepcao",
      });
      await recarregar();
      setMsg("Animal retirado da fila");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function chamarProximo(lane: Lane) {
    setBusyId(`chamar-${lane}`);
    setMsg("");
    try {
      const body = await api<{ id: string; codigo: string }>(
        "/atendimentos/chamar-proximo",
        {
          method: "POST",
          perfil: "recepcao",
          body: JSON.stringify({ lane }),
        },
      );
      await recarregar();
      setMsg(`Chamado ${body.codigo}`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function alterarCapacidade(lane: Lane, valor: number) {
    setMsg("");
    try {
      await api("/fila/capacidades", {
        method: "PATCH",
        perfil: "recepcao",
        body: JSON.stringify({ [lane]: Math.max(1, valor) }),
      });
      await recarregar();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function adicionarNaColuna(opts: {
    variante: VarianteColuna;
    modo: "animal" | "walkin";
    animalIdSel: string;
    tipoSel: string;
    porteSel: string;
    marcadoresSel: string[];
    emergencia: boolean;
  }) {
    setErros({});
    setMsg("");
    const especieCol = especieDaColuna(opts.variante);
    const marcadoresFinais =
      opts.variante === "isolamento"
        ? Array.from(new Set([...opts.marcadoresSel, "isolamento"]))
        : opts.marcadoresSel;

    try {
      let body: IngressoResp;
      if (opts.modo === "animal") {
        body = await api<IngressoResp>(
          `/animais/${opts.animalIdSel}/atendimentos`,
          {
            method: "POST",
            perfil: "recepcao",
            body: JSON.stringify({
              tipo_atendimento: opts.tipoSel,
              marcadores: marcadoresFinais,
            }),
          },
        );
      } else {
        body = await api<IngressoResp>("/atendimentos", {
          method: "POST",
          perfil: "recepcao",
          body: JSON.stringify({
            especie: especieCol,
            porte: opts.porteSel,
            tipo_atendimento: opts.tipoSel,
            marcadores: marcadoresFinais,
          }),
        });
      }

      if (opts.emergencia) {
        const emerg = await api<{ fila: { estado: string } }>(
          `/atendimentos/${body.id}/emergencia`,
          {
            method: "POST",
            perfil: "recepcao",
            body: JSON.stringify({ emergencia: true }),
          },
        );
        setMsg(
          emerg.fila.estado === "em_atendimento"
            ? `Emergência ${body.codigo} em atendimento`
            : `Emergência ${body.codigo} priorizada na fila`,
        );
      } else {
        setMsg(`Ingresso ${body.codigo} na posição ${body.fila.posicao}`);
      }

      setUltimo(body);
      setLinkCopiado(false);
      setColunaAdd(null);
      await recarregar();
    } catch (err) {
      aplicarErros(err, "Falha ao colocar na fila");
    }
  }

  const linkAbsoluto = ultimo
    ? `${window.location.origin}${ultimo.link_tutor.startsWith("/") ? "" : "/"}${ultimo.link_tutor}`
    : null;
  const qrUrl = linkAbsoluto
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(linkAbsoluto)}`
    : null;

  async function copiarLinkTutor() {
    if (!linkAbsoluto) return;
    try {
      await navigator.clipboard.writeText(linkAbsoluto);
      setLinkCopiado(true);
      window.setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      setMsg("Não foi possível copiar o link");
    }
  }

  const salaLivre = snapshot?.recursos.salaIsolamento === "livre";

  return (
    <section className="page painel-fila">
      <header className="page__header">
        <h2>Fila</h2>
        <div className="page__meta">
          {atualizando ? <span className="aviso">Atualizando…</span> : null}
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

      {(snapshot?.alertas ?? []).length > 0 ? (
        <div className="painel painel--alerta" role="status">
          <h3>Alertas</h3>
          {snapshot!.alertas.map((a) => (
            <p key={a.codigo + a.mensagem}>{a.mensagem}</p>
          ))}
        </div>
      ) : null}

      {erroCarga ? <p className="flash flash--erro">{erroCarga}</p> : null}
      {msg ? <p className="flash flash--ok">{msg}</p> : null}

      <div className="em-curso-grid" aria-label="Em atendimento">
        <PainelEmAtendimento
          titulo="Em atendimento · Cães"
          itens={emCaes}
          ocupados={emCaes.length}
          capacidade={capacidades.caes}
          busy={busyId === "chamar-caes"}
          onChamar={() => void chamarProximo("caes")}
          onCapacidade={(n) => void alterarCapacidade("caes", n)}
        />
        <PainelEmAtendimento
          titulo="Em atendimento · Outros"
          itens={emOutros}
          ocupados={emOutros.length}
          capacidade={capacidades.outros}
          busy={busyId === "chamar-outros"}
          onChamar={() => void chamarProximo("outros")}
          onCapacidade={(n) => void alterarCapacidade("outros", n)}
        />
      </div>

      <div className="filas filas--hospital" aria-label="Filas segregadas">
        <FilaColuna
          titulo="Cães"
          variante="cao"
          entradas={colunas.caes}
          busyId={busyId}
          addAberto={colunaAdd === "cao"}
          onAbrir={() => setColunaAdd("cao")}
          onFechar={() => setColunaAdd(null)}
          animais={animaisWalkIn.filter((a) => a.especieFila === "cao")}
          nomeTutor={nomeTutor}
          onAdicionar={(o) => void adicionarNaColuna({ ...o, variante: "cao" })}
          onEmergencia={marcarEmergencia}
          onCancelar={tirarDaFila}
        />
        <FilaColuna
          titulo="Gatos"
          variante="gato"
          entradas={colunas.gatos}
          busyId={busyId}
          addAberto={colunaAdd === "gato"}
          onAbrir={() => setColunaAdd("gato")}
          onFechar={() => setColunaAdd(null)}
          animais={animaisWalkIn.filter((a) => a.especieFila === "gato")}
          nomeTutor={nomeTutor}
          onAdicionar={(o) =>
            void adicionarNaColuna({ ...o, variante: "gato" })
          }
          onEmergencia={marcarEmergencia}
          onCancelar={tirarDaFila}
        />
        <FilaColuna
          titulo="Silvestres"
          variante="silvestre"
          entradas={colunas.silvestres}
          busyId={busyId}
          addAberto={colunaAdd === "silvestre"}
          onAbrir={() => setColunaAdd("silvestre")}
          onFechar={() => setColunaAdd(null)}
          animais={animaisWalkIn.filter((a) => a.especieFila === "silvestre")}
          nomeTutor={nomeTutor}
          onAdicionar={(o) =>
            void adicionarNaColuna({ ...o, variante: "silvestre" })
          }
          onEmergencia={marcarEmergencia}
          onCancelar={tirarDaFila}
        />
        <FilaColuna
          titulo="Isolamento"
          variante="isolamento"
          entradas={colunas.isolamento}
          busyId={busyId}
          addAberto={colunaAdd === "isolamento"}
          onAbrir={() => setColunaAdd("isolamento")}
          onFechar={() => setColunaAdd(null)}
          animais={animaisWalkIn}
          nomeTutor={nomeTutor}
          onAdicionar={(o) =>
            void adicionarNaColuna({ ...o, variante: "isolamento" })
          }
          onEmergencia={marcarEmergencia}
          onCancelar={tirarDaFila}
        />
      </div>

      {ultimo ? (
        <div className="ticket">
          <div className="ticket__corpo">
            <p className="ticket__rotulo">Último ingresso</p>
            <p className="ticket__codigo">{ultimo.codigo}</p>
            <p className="ticket__linha">
              Posição {ultimo.fila.posicao} ·{" "}
              {rotuloEspecie(ultimo.fila.especie)} /{" "}
              {rotuloRisco(ultimo.fila.risco)}
            </p>
            <p className="ticket__linha">
              Espera: entre {ultimo.estimativa.p50} e {ultimo.estimativa.p90}{" "}
              min
            </p>
            <p className="ticket__dica muted">
              Mostre o QR ao tutor ou copie o link do celular
            </p>
            <div className="ticket__acoes">
              <button
                type="button"
                className="primary"
                onClick={() => void copiarLinkTutor()}
              >
                {linkCopiado ? "Link copiado" : "Copiar link"}
              </button>
              <a className="ticket__abrir" href={ultimo.link_tutor}>
                Abrir tela do tutor
              </a>
              <button
                type="button"
                className="ghost"
                onClick={() => void marcarSemLink(ultimo.id)}
              >
                Sem link
              </button>
            </div>
          </div>
          {qrUrl ? (
            <img
              className="ticket__qr"
              src={qrUrl}
              alt="QR do link do tutor"
              width={160}
              height={160}
            />
          ) : null}
        </div>
      ) : null}

      <div className="ingresso-bloco">
        <button
          type="button"
          className="ghost"
          onClick={() => setIngressoAberto((v) => !v)}
        >
          {ingressoAberto ? "Ocultar ingresso" : "Novo ingresso / agenda"}
        </button>

        {ingressoAberto ? (
          <div className="recepcao-acoes">
            <form className="painel" onSubmit={(e) => void onIngressoAnimal(e)}>
              <h3>Colocar animal na fila</h3>
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
                      {a.nome} · {rotuloEspecie(a.especieFila)} ·{" "}
                      {rotuloPorte(a.porte)} · {nomeTutor(a.tutorId)}
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
                  {TIPOS_ATENDIMENTO.map((t) => (
                    <option key={t} value={t}>
                      {rotuloTipo(t)}
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
                    {rotuloRisco(m)}
                  </label>
                ))}
              </fieldset>
              <button
                type="submit"
                disabled={!animalId || animaisWalkIn.length === 0}
              >
                Colocar na fila
              </button>
              {erros.porte ? <span className="erro">{erros.porte}</span> : null}
            </form>

            <div className="painel">
              <h3>Check-in de agenda</h3>
              {agendaPendentes.length === 0 ? (
                <p className="muted">Nenhum agendamento marcado</p>
              ) : (
                <ul className="agenda-lista">
                  {agendaPendentes.map((g) => (
                    <li key={g.id}>
                      <span>
                        {nomeAnimal(g.animalId)} · {rotuloTipo(g.tipo)} ·{" "}
                        {new Date(g.inicioEm).toLocaleString()} ·{" "}
                        {g.duracaoMinutos} min
                      </span>
                      <button type="button" onClick={() => void onCheckIn(g.id)}>
                        Check-in
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form
              className="painel painel--quiet"
              onSubmit={(e) => void onSubmit(e)}
            >
              <h3>Ingresso sem cadastro</h3>
              <label>
                Espécie
                <select
                  value={especie}
                  onChange={(e) => setEspecie(e.target.value)}
                >
                  {OPCOES_ESPECIE.map((e) => (
                    <option key={e} value={e}>
                      {rotuloEspecie(e)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Porte
                <select value={porte} onChange={(e) => setPorte(e.target.value)}>
                  {OPCOES_PORTE.map((p) => (
                    <option key={p} value={p}>
                      {rotuloPorte(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS_ATENDIMENTO.map((t) => (
                    <option key={t} value={t}>
                      {rotuloTipo(t)}
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
                      checked={marcadores.includes(m)}
                      onChange={() => toggleMarcador(m)}
                    />
                    {rotuloRisco(m)}
                  </label>
                ))}
              </fieldset>
              <button type="submit">Registrar</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function IconeEngrenagem() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function PainelEmAtendimento({
  titulo,
  itens,
  ocupados,
  capacidade,
  busy,
  onChamar,
  onCapacidade,
}: {
  titulo: string;
  itens: EmAtendimentoItem[];
  ocupados: number;
  capacidade: number;
  busy: boolean;
  onChamar: () => void;
  onCapacidade: (n: number) => void;
}) {
  const [configAberto, setConfigAberto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configAberto) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setConfigAberto(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfigAberto(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [configAberto]);

  return (
    <div className="em-curso" ref={wrapRef}>
      <div className="em-curso__topo">
        <p className="em-curso__rotulo">{titulo}</p>
        <div className="em-curso__topo-direita">
          <span className="em-curso__slots">
            {ocupados}/{capacidade}
          </span>
          <button
            type="button"
            className="em-curso__gear"
            aria-label="Ajustar vagas"
            aria-expanded={configAberto}
            aria-haspopup="dialog"
            onClick={() => setConfigAberto((v) => !v)}
          >
            <IconeEngrenagem />
          </button>
          {configAberto ? (
            <div className="em-curso__popover" role="dialog" aria-label="Vagas">
              <label>
                Vagas
                <input
                  type="number"
                  min={1}
                  value={capacidade}
                  autoFocus
                  onChange={(e) =>
                    onCapacidade(Number(e.target.value) || 1)
                  }
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
      <div className="em-curso__cap">
        <button
          type="button"
          className="primary"
          disabled={busy || ocupados >= capacidade}
          onClick={onChamar}
        >
          Chamar próximo
        </button>
      </div>
      {itens.length === 0 ? (
        <p className="muted">Nenhum atendimento em curso</p>
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

function FilaColuna({
  titulo,
  variante,
  entradas,
  busyId,
  addAberto,
  onAbrir,
  onFechar,
  animais,
  nomeTutor,
  onAdicionar,
  onEmergencia,
  onCancelar,
}: {
  titulo: string;
  variante: VarianteColuna;
  entradas: [string, ItemFilaSnapshot[]][];
  busyId: string | null;
  addAberto: boolean;
  onAbrir: () => void;
  onFechar: () => void;
  animais: Animal[];
  nomeTutor: (id: string) => string;
  onAdicionar: (opts: {
    modo: "animal" | "walkin";
    animalIdSel: string;
    tipoSel: string;
    porteSel: string;
    marcadoresSel: string[];
    emergencia: boolean;
  }) => void;
  onEmergencia: (id: string) => void;
  onCancelar: (id: string) => void;
}) {
  const itens = entradas.flatMap(([, lista]) => lista);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const [modo, setModo] = useState<"animal" | "walkin">("animal");
  const [animalIdSel, setAnimalIdSel] = useState("");
  const [tipoSel, setTipoSel] = useState("consulta");
  const [porteSel, setPorteSel] = useState("pequeno");
  const [marcadoresSel, setMarcadoresSel] = useState<string[]>(
    variante === "isolamento" ? ["isolamento"] : [],
  );
  const [emergencia, setEmergencia] = useState(false);

  const estavaAberto = useRef(false);
  useEffect(() => {
    if (addAberto && !estavaAberto.current) {
      setAnimalIdSel(animais[0]?.id ?? "");
      setMarcadoresSel(variante === "isolamento" ? ["isolamento"] : []);
      setEmergencia(false);
      setModo("animal");
    }
    if (
      addAberto &&
      animais.length > 0 &&
      !animais.some((a) => a.id === animalIdSel)
    ) {
      setAnimalIdSel(animais[0]?.id ?? "");
    }
    estavaAberto.current = addAberto;
  }, [addAberto, animais, variante, animalIdSel]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (addAberto && !d.open) d.showModal();
    if (!addAberto && d.open) d.close();
  }, [addAberto]);

  function fecharDialog() {
    onFechar();
    dialogRef.current?.close();
  }

  return (
    <div className={`fila-col fila-col--${variante}`}>
      <div className="fila-col__cabeca">
        <span>
          {titulo}
          <span className="fila-col__count">{itens.length}</span>
        </span>
        <button
          ref={addBtnRef}
          type="button"
          className="fila-col__add"
          aria-label={`Adicionar em ${titulo}`}
          aria-haspopup="dialog"
          aria-expanded={addAberto}
          onClick={() => (addAberto ? onFechar() : onAbrir())}
        >
          +
        </button>
      </div>
      <dialog
        ref={dialogRef}
        className={`fila-dialog fila-dialog--${variante}`}
        aria-labelledby={`fila-dialog-titulo-${variante}`}
        onClose={() => {
          onFechar();
          addBtnRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) fecharDialog();
        }}
      >
        <div className="fila-dialog__cabeca">
          <h3 id={`fila-dialog-titulo-${variante}`}>Adicionar · {titulo}</h3>
          <button
            type="button"
            className="fila-dialog__fechar"
            aria-label="Fechar"
            onClick={fecharDialog}
          >
            ×
          </button>
        </div>
        <form
          className="fila-dialog__corpo"
          onSubmit={(e) => {
            e.preventDefault();
            onAdicionar({
              modo,
              animalIdSel,
              tipoSel,
              porteSel,
              marcadoresSel,
              emergencia,
            });
          }}
        >
          <div className="fila-dialog__modo">
            <button
              type="button"
              className={modo === "animal" ? "primary" : "ghost"}
              onClick={() => setModo("animal")}
            >
              Cadastrado
            </button>
            <button
              type="button"
              className={modo === "walkin" ? "primary" : "ghost"}
              onClick={() => setModo("walkin")}
            >
              Sem cadastro
            </button>
          </div>
          {modo === "animal" ? (
            <label>
              Animal
              <select
                value={animalIdSel}
                onChange={(e) => setAnimalIdSel(e.target.value)}
                required
              >
                {animais.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} · {rotuloPorte(a.porte)} · {nomeTutor(a.tutorId)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Porte
              <select
                value={porteSel}
                onChange={(e) => setPorteSel(e.target.value)}
              >
                {OPCOES_PORTE.filter((p) => p !== "grande").map((p) => (
                  <option key={p} value={p}>
                    {rotuloPorte(p)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Tipo
            <select
              value={tipoSel}
              onChange={(e) => setTipoSel(e.target.value)}
            >
              {TIPOS_ATENDIMENTO.map((t) => (
                <option key={t} value={t}>
                  {rotuloTipo(t)}
                </option>
              ))}
            </select>
          </label>
          {variante !== "isolamento" ? (
            <fieldset>
              <legend>Marcadores</legend>
              {["reativo", "cio", "isolamento"].map((m) => (
                <label key={m} className="check">
                  <input
                    type="checkbox"
                    checked={marcadoresSel.includes(m)}
                    onChange={() =>
                      setMarcadoresSel((prev) =>
                        prev.includes(m)
                          ? prev.filter((x) => x !== m)
                          : [...prev, m],
                      )
                    }
                  />
                  {rotuloRisco(m)}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="muted">Marcador isolamento aplicado</p>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={emergencia}
              onChange={(e) => setEmergencia(e.target.checked)}
            />
            Emergência (vai direto se houver vaga)
          </label>
          <button
            type="submit"
            className="primary fila-dialog__submit"
            disabled={modo === "animal" && !animalIdSel}
          >
            Colocar na fila
          </button>
        </form>
      </dialog>
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
              <div className="fila-linha__acoes">
                {!i.emergencia ? (
                  <button
                    type="button"
                    className="danger"
                    disabled={busyId === i.id}
                    onClick={() => void onEmergencia(i.id)}
                  >
                    Emergência
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost"
                  disabled={busyId === i.id}
                  onClick={() => void onCancelar(i.id)}
                >
                  Tirar da fila
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
