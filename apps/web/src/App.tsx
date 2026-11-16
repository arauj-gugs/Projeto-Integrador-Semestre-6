import { useEffect, useState } from "react";
import { CadastroPage } from "./CadastroPage";
import { HistoricoPage } from "./HistoricoPage";
import { MeuAnimalPage } from "./MeuAnimalPage";
import { RecepcaoPage } from "./RecepcaoPage";
import { TutorPage } from "./TutorPage";
import { VeterinarioPage } from "./VeterinarioPage";

function lerRota(): { nome: string; token?: string } {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("tutor/")) {
    return { nome: "tutor", token: hash.slice("tutor/".length) };
  }
  if (hash === "recepcao") return { nome: "recepcao" };
  if (hash === "veterinario") return { nome: "veterinario" };
  if (hash === "historico") return { nome: "historico" };
  if (hash === "cadastro") return { nome: "cadastro" };
  if (hash === "meu-animal") return { nome: "meu-animal" };
  return { nome: "home" };
}

export function App() {
  const [rota, setRota] = useState(lerRota);

  useEffect(() => {
    const onHash = () => setRota(lerRota());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (rota.nome === "tutor" && rota.token) {
    return <TutorPage token={rota.token} />;
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>Fila Virtual</h1>
        <nav className="nav">
          <a href="#/cadastro">Cadastro</a>
          <a href="#/recepcao">Recepção</a>
          <a href="#/veterinario">Veterinário</a>
          <a href="#/historico">Histórico</a>
          <a href="#/meu-animal">Meu animal</a>
        </nav>
      </header>
      {rota.nome === "cadastro" ? <CadastroPage /> : null}
      {rota.nome === "recepcao" ? <RecepcaoPage /> : null}
      {rota.nome === "veterinario" ? <VeterinarioPage /> : null}
      {rota.nome === "meu-animal" ? <MeuAnimalPage /> : null}
      {rota.nome === "historico" || rota.nome === "home" ? (
        <HistoricoPage />
      ) : null}
    </main>
  );
}
