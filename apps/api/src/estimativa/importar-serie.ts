import { TIPOS_ATENDIMENTO, type TipoAtendimento } from "./constantes.js";
import type { SeriePorTipo } from "./faixa.js";

export type OrigemAmostra = "direta" | "retrospectiva" | "entrevista";

export type AmostraCampo = {
  tipo: TipoAtendimento;
  inicio: Date;
  fim: Date;
  duracao_minutos: number;
  origem: OrigemAmostra;
  linha: number;
};

export type LinhaRejeitada = {
  linha: number;
  motivo: string;
};

export type ResultadoImportacao = {
  aceitas: AmostraCampo[];
  rejeitadas: LinhaRejeitada[];
  serie: SeriePorTipo;
};

const TIPOS_SET = new Set<string>(TIPOS_ATENDIMENTO);

function normalizarTipo(raw: string): TipoAtendimento | null {
  const chave = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace("emergência", "emergencia");
  const mapa: Record<string, TipoAtendimento> = {
    consulta: "consulta",
    vacina: "vacina",
    ultrassom: "ultrassom",
    "raio-x": "raio-x",
    raiox: "raio-x",
    coleta: "coleta",
    castracao: "castracao",
    cirurgia: "cirurgia",
    emergencia: "emergencia",
    // aliases da fatia F1 anterior → tipos RF-01
    retorno: "consulta",
    exame: "ultrassom",
  };
  const tipo = mapa[chave];
  return tipo && TIPOS_SET.has(tipo) ? tipo : null;
}

function parseCsvLinhas(csv: string): string[][] {
  const linhas = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  return linhas
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map((l) => l.split(",").map((c) => c.trim()));
}

/**
 * Importa CSV no formato do anexo D (RF-11): motivo, inicio, fim [, origem].
 * Linhas sem motivo, inicio ou fim são rejeitadas com o número da linha.
 */
export function importarSerieCsv(csv: string): ResultadoImportacao {
  const linhas = parseCsvLinhas(csv);
  if (linhas.length === 0) {
    return { aceitas: [], rejeitadas: [], serie: {} };
  }

  const cabecalho = (linhas[0] ?? []).map((c) =>
    c.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""),
  );
  const idxMotivo = cabecalho.findIndex((c) => c === "motivo");
  const idxInicio = cabecalho.findIndex((c) => c === "inicio");
  const idxFim = cabecalho.findIndex((c) => c === "fim");
  const idxOrigem = cabecalho.findIndex((c) => c === "origem");

  const aceitas: AmostraCampo[] = [];
  const rejeitadas: LinhaRejeitada[] = [];
  const serie: SeriePorTipo = {};

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i] ?? [];
    const numeroLinha = i + 1; // 1-based, incluindo cabeçalho
    const motivoRaw = idxMotivo >= 0 ? (cols[idxMotivo] ?? "") : "";
    const inicioRaw = idxInicio >= 0 ? (cols[idxInicio] ?? "") : "";
    const fimRaw = idxFim >= 0 ? (cols[idxFim] ?? "") : "";
    const origemRaw =
      idxOrigem >= 0 ? (cols[idxOrigem] ?? "direta") : "direta";

    if (!motivoRaw) {
      rejeitadas.push({ linha: numeroLinha, motivo: "motivo ausente" });
      continue;
    }
    if (!inicioRaw) {
      rejeitadas.push({ linha: numeroLinha, motivo: "inicio ausente" });
      continue;
    }
    if (!fimRaw) {
      rejeitadas.push({ linha: numeroLinha, motivo: "fim ausente" });
      continue;
    }

    const tipo = normalizarTipo(motivoRaw);
    if (!tipo) {
      rejeitadas.push({
        linha: numeroLinha,
        motivo: `motivo inválido: ${motivoRaw}`,
      });
      continue;
    }

    const inicio = new Date(inicioRaw);
    const fim = new Date(fimRaw);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      rejeitadas.push({
        linha: numeroLinha,
        motivo: "inicio ou fim inválido",
      });
      continue;
    }

    const duracao_minutos = Math.round(
      (fim.getTime() - inicio.getTime()) / 60_000,
    );
    if (duracao_minutos < 1) {
      rejeitadas.push({
        linha: numeroLinha,
        motivo: "duração menor que 1 min",
      });
      continue;
    }

    const origemNorm = origemRaw.trim().toLowerCase();
    const origem: OrigemAmostra =
      origemNorm === "retrospectiva"
        ? "retrospectiva"
        : origemNorm === "entrevista"
          ? "entrevista"
          : "direta";

    const amostra: AmostraCampo = {
      tipo,
      inicio,
      fim,
      duracao_minutos,
      origem,
      linha: numeroLinha,
    };
    aceitas.push(amostra);
    const lista = serie[tipo] ?? [];
    lista.push(duracao_minutos);
    serie[tipo] = lista;
  }

  return { aceitas, rejeitadas, serie };
}
