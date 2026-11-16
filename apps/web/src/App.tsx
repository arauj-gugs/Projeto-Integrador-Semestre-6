import { useEffect, useState } from "react";
import { CadastroPage } from "./CadastroPage";
import { HistoricoPage } from "./HistoricoPage";
import { MeuAnimalPage } from "./MeuAnimalPage";
import { PainelTvPage } from "./PainelTvPage";
import { RecepcaoPage } from "./RecepcaoPage";
import { TutorPage } from "./TutorPage";
import { VeterinarioPage } from "./VeterinarioPage";

type Rota = { nome: string; token?: string };

const ROTAS_CLINICA = new Set([
  "home",
  "recepcao",
  "veterinario",
  "historico",
  "cadastro",
]);

function lerRota(): Rota {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("tutor/")) {
    return { nome: "tutor", token: hash.slice("tutor/".length) };
  }
  if (hash === "recepcao") return { nome: "recepcao" };
  if (hash === "veterinario") return { nome: "veterinario" };
  if (hash === "historico") return { nome: "historico" };
  if (hash === "cadastro") return { nome: "cadastro" };
  if (hash === "meu-animal") return { nome: "meu-animal" };
  if (hash === "painel") return { nome: "painel" };
  return { nome: "home" };
}

function linkClinica(
  href: string,
  rotulo: string,
  nomeAtual: string,
  nomes: string[],
) {
  const ativo = nomes.includes(nomeAtual);
  return (
    <a href={href} aria-current={ativo ? "page" : undefined}>
      {rotulo}
    </a>
  );
}

export function App() {
  const [rota, setRota] = useState(lerRota);

  useEffect(() => {
    const onHash = () => setRota(lerRota());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (rota.nome === "tutor" && rota.token) {
    return (
      <div className="publico">
        <TutorPage token={rota.token} />
      </div>
    );
  }

  if (rota.nome === "meu-animal") {
    return (
      <div className="publico">
        <MeuAnimalPage />
      </div>
    );
  }

  if (rota.nome === "painel") {
    return <PainelTvPage />;
  }

  if (!ROTAS_CLINICA.has(rota.nome)) {
    return null;
  }

  const nomePagina = rota.nome === "home" ? "recepcao" : rota.nome;

  return (
    <div className="clinic">
      <aside className="clinic__nav">
        <p className="clinic__brand">
          Fila Virtual
          <span>Clínica</span>
        </p>
        <nav className="clinic__links" aria-label="Áreas da clínica">
          {linkClinica("#/recepcao", "Fila", nomePagina, [
            "recepcao",
            "home",
          ])}
          {linkClinica("#/veterinario", "Veterinário", nomePagina, [
            "veterinario",
          ])}
          {linkClinica("#/cadastro", "Cadastro", nomePagina, ["cadastro"])}
          {linkClinica("#/historico", "Histórico", nomePagina, ["historico"])}
          <a href="#/painel" target="_blank" rel="noreferrer">
            Painel TV
          </a>
        </nav>
      </aside>
      <main className="clinic__main">
        {rota.nome === "cadastro" ? <CadastroPage /> : null}
        {rota.nome === "recepcao" || rota.nome === "home" ? (
          <RecepcaoPage />
        ) : null}
        {rota.nome === "veterinario" ? <VeterinarioPage /> : null}
        {rota.nome === "historico" ? <HistoricoPage /> : null}
      </main>
    </div>
  );
}
