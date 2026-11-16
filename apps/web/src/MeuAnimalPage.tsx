import { useState, type FormEvent } from "react";
import { api } from "./api";
import { rotuloEspecie, rotuloPorte } from "./rotulos";

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

type AcessoResp = {
  tutor_id: string;
  nome: string;
  telefone: string;
  animais: Animal[];
};

export function MeuAnimalPage() {
  const [telefone, setTelefone] = useState("");
  const [pin, setPin] = useState("");
  const [dados, setDados] = useState<AcessoResp | null>(null);
  const [erro, setErro] = useState("");

  async function onAcesso(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setDados(null);
    try {
      const body = await api<AcessoResp>("/tutor/acesso", {
        method: "POST",
        body: JSON.stringify({
          telefone: telefone.trim(),
          pin: pin.trim(),
        }),
      });
      setDados(body);
    } catch {
      setErro("Telefone ou PIN inválidos");
    }
  }

  return (
    <section className="tutor">
      <p className="tutor__marca">Fila Virtual</p>
      <header className="page__header">
        <h2>Meu animal</h2>
      </header>
      <p className="muted">Acesso com telefone e PIN</p>

      <form className="painel" onSubmit={(e) => void onAcesso(e)}>
        <label>
          Telefone
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
            minLength={8}
            autoComplete="tel"
          />
        </label>
        <label>
          PIN
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            minLength={4}
            autoComplete="one-time-code"
          />
        </label>
        <button type="submit">Entrar</button>
      </form>

      {erro ? <p className="flash flash--erro">{erro}</p> : null}

      {dados ? (
        <div>
          <h3>{dados.nome}</h3>
          <p className="muted">{dados.telefone}</p>
          {dados.animais.length === 0 ? (
            <p className="muted">Nenhum animal cadastrado</p>
          ) : (
            <ul className="meu-animal__lista">
              {dados.animais.map((a) => (
                <li key={a.id} className="meu-animal__item">
                  <strong>{a.nome}</strong>
                  {rotuloEspecie(a.especieFila)}
                  {a.especieDetalhe ? ` / ${a.especieDetalhe}` : ""} ·{" "}
                  {rotuloPorte(a.porte)}
                  {a.raca ? ` · ${a.raca}` : ""}
                  {a.sexo ? ` · ${a.sexo}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
