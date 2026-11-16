import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "./api";

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

type Tutor = {
  id: string;
  nome: string;
  telefone: string;
  pinAcesso?: string;
};

type Animal = {
  id: string;
  tutorId: string;
  nome: string;
  especieFila: string;
  especieDetalhe: string | null;
  porte: string;
  sexo: string | null;
  castrado: boolean | null;
  raca: string | null;
};

type Agendamento = {
  id: string;
  animalId: string;
  tipo: string;
  inicioEm: string;
  duracaoMinutos: number;
  estado: string;
};

type Peso = {
  id: string;
  animalId: string;
  kg: number;
  medidoEm: string;
};

const perfilEquipe = { perfil: "recepcao" as const };

export function CadastroPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [pinCriado, setPinCriado] = useState<string | null>(null);

  const [tutorNome, setTutorNome] = useState("");
  const [tutorTel, setTutorTel] = useState("");

  const [animalTutorId, setAnimalTutorId] = useState("");
  const [animalNome, setAnimalNome] = useState("");
  const [especieFila, setEspecieFila] = useState("cao");
  const [especieDetalhe, setEspecieDetalhe] = useState("");
  const [porte, setPorte] = useState("medio");
  const [sexo, setSexo] = useState("");
  const [castrado, setCastrado] = useState(false);
  const [raca, setRaca] = useState("");
  const [nascidoEm, setNascidoEm] = useState("");

  const [pesoAnimalId, setPesoAnimalId] = useState("");
  const [pesoKg, setPesoKg] = useState("10");

  const [termoTutorId, setTermoTutorId] = useState("");
  const [termoAnimalId, setTermoAnimalId] = useState("");
  const [termoFinalidade, setTermoFinalidade] = useState(
    "consulta e procedimentos ambulatoriais",
  );

  const [agendaAnimalId, setAgendaAnimalId] = useState("");
  const [agendaTipo, setAgendaTipo] = useState<string>("cirurgia");
  const [agendaInicio, setAgendaInicio] = useState("");
  const [agendaDuracao, setAgendaDuracao] = useState("60");

  const carregar = useCallback(async () => {
    const [t, a, g] = await Promise.all([
      api<Tutor[]>("/tutores", perfilEquipe),
      api<Animal[]>("/animais", perfilEquipe),
      api<Agendamento[]>("/agendamentos", perfilEquipe),
    ]);
    setTutores(t);
    setAnimais(a);
    setAgendamentos(g);
  }, []);

  useEffect(() => {
    void carregar().catch(() => setErro("Falha ao carregar cadastros"));
  }, [carregar]);

  useEffect(() => {
    if (!animalTutorId && tutores[0]) setAnimalTutorId(tutores[0].id);
    if (!termoTutorId && tutores[0]) setTermoTutorId(tutores[0].id);
  }, [tutores, animalTutorId, termoTutorId]);

  useEffect(() => {
    if (!pesoAnimalId && animais[0]) setPesoAnimalId(animais[0].id);
    if (!termoAnimalId && animais[0]) setTermoAnimalId(animais[0].id);
    if (!agendaAnimalId && animais[0]) setAgendaAnimalId(animais[0].id);
  }, [animais, pesoAnimalId, termoAnimalId, agendaAnimalId]);

  useEffect(() => {
    if (!pesoAnimalId) {
      setPesos([]);
      return;
    }
    void api<Peso[]>(`/animais/${pesoAnimalId}/pesos`, perfilEquipe)
      .then(setPesos)
      .catch(() => setPesos([]));
  }, [pesoAnimalId]);

  function nomeTutor(id: string): string {
    return tutores.find((t) => t.id === id)?.nome ?? id.slice(0, 8);
  }

  function nomeAnimal(id: string): string {
    return animais.find((a) => a.id === id)?.nome ?? id.slice(0, 8);
  }

  function atalhoGrande() {
    setPorte("grande");
    setEspecieFila("silvestre");
    if (!especieDetalhe.trim()) setEspecieDetalhe("cavalo");
  }

  async function onTutor(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setPinCriado(null);
    try {
      const tutor = await api<Tutor>("/tutores", {
        method: "POST",
        ...perfilEquipe,
        body: JSON.stringify({
          nome: tutorNome.trim(),
          telefone: tutorTel.trim(),
        }),
      });
      setTutorNome("");
      setTutorTel("");
      setPinCriado(tutor.pinAcesso ?? null);
      setMsg(
        tutor.pinAcesso
          ? `Tutor cadastrado. PIN de acesso: ${tutor.pinAcesso}`
          : "Tutor cadastrado",
      );
      await carregar();
    } catch {
      setErro("Falha ao cadastrar tutor (telefone obrigatório)");
    }
  }

  async function onAnimal(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    try {
      await api("/animais", {
        method: "POST",
        ...perfilEquipe,
        body: JSON.stringify({
          tutor_id: animalTutorId,
          nome: animalNome.trim(),
          especie_fila: especieFila,
          especie_detalhe: especieDetalhe.trim() || null,
          porte: porte.trim(),
          sexo: sexo.trim() || null,
          castrado,
          raca: raca.trim() || null,
          nascido_em: nascidoEm
            ? new Date(nascidoEm).toISOString()
            : null,
        }),
      });
      setAnimalNome("");
      setEspecieDetalhe("");
      setRaca("");
      setNascidoEm("");
      setMsg(
        porte === "grande"
          ? "Grande cadastrado (entrada só por agenda)"
          : "Animal cadastrado",
      );
      await carregar();
    } catch {
      setErro(
        "Falha ao cadastrar animal (grande exige silvestre + detalhe)",
      );
    }
  }

  async function onPeso(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    try {
      await api(`/animais/${pesoAnimalId}/pesos`, {
        method: "POST",
        ...perfilEquipe,
        body: JSON.stringify({ kg: Number(pesoKg) }),
      });
      setMsg("Peso registrado");
      const lista = await api<Peso[]>(
        `/animais/${pesoAnimalId}/pesos`,
        perfilEquipe,
      );
      setPesos(lista);
    } catch {
      setErro("Falha ao registrar peso");
    }
  }

  async function onTermo(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    try {
      await api("/termos", {
        method: "POST",
        ...perfilEquipe,
        body: JSON.stringify({
          tutor_id: termoTutorId,
          animal_id: termoAnimalId || null,
          finalidade: termoFinalidade.trim(),
        }),
      });
      setMsg("Termo registrado");
    } catch {
      setErro("Falha ao registrar termo");
    }
  }

  async function onAgenda(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    try {
      await api("/agendamentos", {
        method: "POST",
        ...perfilEquipe,
        body: JSON.stringify({
          animal_id: agendaAnimalId,
          tipo: agendaTipo,
          inicio_em: new Date(agendaInicio).toISOString(),
          duracao_minutos: Number(agendaDuracao),
        }),
      });
      setMsg("Agendamento criado");
      await carregar();
    } catch {
      setErro("Falha ao criar agendamento");
    }
  }

  const grandes = animais.filter((a) => a.porte === "grande");

  return (
    <section className="page">
      <header className="page__header">
        <h2>Cadastro</h2>
        <p className="muted">
          Prontuário simulado (tutor, animal, peso, termo, agenda)
        </p>
      </header>

      {msg ? <p>{msg}</p> : null}
      {pinCriado ? (
        <p className="aviso">
          Guarde o PIN do tutor: <strong>{pinCriado}</strong> (só aparece agora)
        </p>
      ) : null}
      {erro ? <p className="erro">{erro}</p> : null}

      <form className="card" onSubmit={(e) => void onTutor(e)}>
        <h3>Tutor</h3>
        <label>
          Nome
          <input
            value={tutorNome}
            onChange={(e) => setTutorNome(e.target.value)}
            required
          />
        </label>
        <label>
          Telefone (obrigatório)
          <input
            value={tutorTel}
            onChange={(e) => setTutorTel(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit">Salvar tutor</button>
      </form>

      <form className="card" onSubmit={(e) => void onAnimal(e)}>
        <h3>Animal</h3>
        <p>
          <button type="button" onClick={atalhoGrande}>
            Atalho: grande (silvestre + detalhe)
          </button>
        </p>
        <label>
          Tutor
          <select
            value={animalTutorId}
            onChange={(e) => setAnimalTutorId(e.target.value)}
            required
          >
            {tutores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nome
          <input
            value={animalNome}
            onChange={(e) => setAnimalNome(e.target.value)}
            required
          />
        </label>
        <label>
          Espécie (fila)
          <select
            value={especieFila}
            onChange={(e) => setEspecieFila(e.target.value)}
          >
            <option value="cao">Cão</option>
            <option value="gato">Gato</option>
            <option value="silvestre">Silvestre</option>
          </select>
        </label>
        <label>
          Detalhe (obrigatório se grande: cavalo, boi…)
          <input
            value={especieDetalhe}
            onChange={(e) => setEspecieDetalhe(e.target.value)}
            required={porte === "grande"}
          />
        </label>
        <label>
          Porte
          <select value={porte} onChange={(e) => setPorte(e.target.value)}>
            <option value="pequeno">pequeno</option>
            <option value="medio">medio</option>
            <option value="grande">grande</option>
          </select>
        </label>
        <label>
          Sexo
          <input value={sexo} onChange={(e) => setSexo(e.target.value)} />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={castrado}
            onChange={(e) => setCastrado(e.target.checked)}
          />
          Castrado
        </label>
        <label>
          Raça
          <input value={raca} onChange={(e) => setRaca(e.target.value)} />
        </label>
        <label>
          Nascido em
          <input
            type="date"
            value={nascidoEm}
            onChange={(e) => setNascidoEm(e.target.value)}
          />
        </label>
        <button type="submit" disabled={!animalTutorId}>
          Salvar animal
        </button>
      </form>

      <form className="card" onSubmit={(e) => void onPeso(e)}>
        <h3>Peso</h3>
        <label>
          Animal
          <select
            value={pesoAnimalId}
            onChange={(e) => setPesoAnimalId(e.target.value)}
            required
          >
            {animais.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} ({nomeTutor(a.tutorId)})
              </option>
            ))}
          </select>
        </label>
        <label>
          Kg (inteiro)
          <input
            type="number"
            min={1}
            step={1}
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={!pesoAnimalId}>
          Registrar peso
        </button>
        {pesos.length > 0 ? (
          <ul>
            {pesos.map((p) => (
              <li key={p.id}>
                {p.kg} kg · {new Date(p.medidoEm).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <form className="card" onSubmit={(e) => void onTermo(e)}>
        <h3>Termo de consentimento</h3>
        <label>
          Tutor
          <select
            value={termoTutorId}
            onChange={(e) => setTermoTutorId(e.target.value)}
            required
          >
            {tutores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Animal (opcional)
          <select
            value={termoAnimalId}
            onChange={(e) => setTermoAnimalId(e.target.value)}
          >
            <option value="">—</option>
            {animais.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Finalidade
          <input
            value={termoFinalidade}
            onChange={(e) => setTermoFinalidade(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={!termoTutorId}>
          Registrar termo
        </button>
      </form>

      <form className="card" onSubmit={(e) => void onAgenda(e)}>
        <h3>Agendamento (grandes / cirurgia)</h3>
        {grandes.length > 0 ? (
          <p className="aviso">
            Grandes na agenda:{" "}
            {grandes.map((a) => a.nome).join(", ")}
          </p>
        ) : null}
        <label>
          Animal
          <select
            value={agendaAnimalId}
            onChange={(e) => setAgendaAnimalId(e.target.value)}
            required
          >
            {animais.map((a) => (
              <option key={a.id} value={a.id}>
                {a.porte === "grande" ? "★ " : ""}
                {a.nome} · {a.especieFila}
                {a.especieDetalhe ? `/${a.especieDetalhe}` : ""} · {a.porte}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            value={agendaTipo}
            onChange={(e) => setAgendaTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Início
          <input
            type="datetime-local"
            value={agendaInicio}
            onChange={(e) => setAgendaInicio(e.target.value)}
            required
          />
        </label>
        <label>
          Duração (min)
          <input
            type="number"
            min={1}
            value={agendaDuracao}
            onChange={(e) => setAgendaDuracao(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={!agendaAnimalId}>
          Criar agendamento
        </button>
      </form>

      <div className="card">
        <h3>Tutores ({tutores.length})</h3>
        <ul>
          {tutores.map((t) => (
            <li key={t.id}>
              {t.nome} · {t.telefone}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Animais ({animais.length})</h3>
        <ul>
          {animais.map((a) => (
            <li key={a.id}>
              {a.porte === "grande" ? "★ " : ""}
              {a.nome} · {a.especieFila}
              {a.especieDetalhe ? `/${a.especieDetalhe}` : ""} · {a.porte} ·
              tutor {nomeTutor(a.tutorId)}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Agendamentos ({agendamentos.length})</h3>
        <ul>
          {agendamentos.map((g) => {
            const animal = animais.find((a) => a.id === g.animalId);
            const ehGrande = animal?.porte === "grande";
            return (
              <li key={g.id}>
                {ehGrande ? "★ " : ""}
                {nomeAnimal(g.animalId)} · {g.tipo} ·{" "}
                {new Date(g.inicioEm).toLocaleString()} · {g.duracaoMinutos}{" "}
                min · {g.estado}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
