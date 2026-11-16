import { HistoricoPage } from "./HistoricoPage";

export function App() {
  return (
    <main className="app">
      <header className="app__header">
        <h1>Fila Virtual</h1>
        <p>Histórico do dia e indicadores da estimativa (F1)</p>
      </header>
      <HistoricoPage />
    </main>
  );
}
