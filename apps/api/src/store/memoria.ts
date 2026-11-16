import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import type { TipoAtendimento } from "../estimativa/constantes.js";
import type { SeriePorTipo } from "../estimativa/faixa.js";
import { getDb } from "../db/client.js";
import { limparTodasAsTabelas } from "../db/reset.js";
import {
  atendimentos,
  sequencias,
  serieCampo,
} from "../db/schema.js";
import type { AtendimentoMemoria, AmostraMemoria } from "./tipos.js";

export type { AtendimentoMemoria, AmostraMemoria, EstadoAtendimento, OrigemAtendimento } from "./tipos.js";

function rowParaAtendimento(
  row: typeof atendimentos.$inferSelect,
): AtendimentoMemoria {
  return {
    id: row.id,
    codigo: row.codigo,
    animal_id: row.animalId,
    agendamento_id: row.agendamentoId,
    origem: (row.origem as AtendimentoMemoria["origem"]) ?? "chegada",
    especie: row.especie,
    porte: row.porte,
    tipo: row.tipo as TipoAtendimento,
    reativo: row.reativo,
    suspeita_infectocontagiosa: row.suspeitaInfectocontagiosa,
    marcador_cio: row.marcadorCio,
    estado: row.estado as AtendimentoMemoria["estado"],
    emergencia: row.emergencia,
    emergencia_desde: row.emergenciaDesde,
    previsto_ingresso_p50: row.previstoIngressoP50,
    previsto_ingresso_p90: row.previstoIngressoP90,
    estimativa_degradada: row.estimativaDegradada,
    inicio_previsto: row.inicioPrevisto,
    espera_atual_p50: row.esperaAtualP50,
    espera_atual_p90: row.esperaAtualP90,
    inicio_real: row.inicioReal,
    fim_real: row.fimReal,
    realizado_minutos: row.realizadoMinutos,
    espera_realizada_minutos: row.esperaRealizadaMinutos,
    erro_minutos: row.erroMinutos,
    erro_absoluto_minutos: row.erroAbsolutoMinutos,
    suspeita: row.suspeita,
    link_token: row.linkToken,
    criado_em: row.criadoEm,
  };
}

export async function resetStore(): Promise<void> {
  await limparTodasAsTabelas();
}

export function novoId(): string {
  return randomUUID();
}

export function novoToken(): string {
  return randomBytes(16).toString("hex");
}

export async function proximoCodigo(): Promise<string> {
  const db = getDb();
  await db
    .insert(sequencias)
    .values({ nome: "atendimento_codigo", valor: 0 })
    .onConflictDoNothing();

  const atualizado = await db
    .update(sequencias)
    .set({ valor: sql`${sequencias.valor} + 1` })
    .where(eq(sequencias.nome, "atendimento_codigo"))
    .returning({ valor: sequencias.valor });

  const n = atualizado[0]?.valor ?? 1;
  return `A${String(n).padStart(3, "0")}`;
}

export async function listarAguardandoOuEmCurso(): Promise<AtendimentoMemoria[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(atendimentos)
    .where(ne(atendimentos.estado, "encerrado"));
  return rows
    .filter((r) =>
      ["aguardando", "aguardando_sala", "em_atendimento"].includes(r.estado),
    )
    .map(rowParaAtendimento);
}

export async function obterAtendimento(
  id: string,
): Promise<AtendimentoMemoria | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowParaAtendimento(row) : undefined;
}

export async function salvarAtendimento(a: AtendimentoMemoria): Promise<void> {
  const db = getDb();
  const valores = {
    id: a.id,
    codigo: a.codigo,
    animalId: a.animal_id,
    agendamentoId: a.agendamento_id,
    origem: a.origem,
    especie: a.especie,
    porte: a.porte,
    tipo: a.tipo,
    reativo: a.reativo,
    suspeitaInfectocontagiosa: a.suspeita_infectocontagiosa,
    marcadorCio: a.marcador_cio,
    estado: a.estado,
    emergencia: a.emergencia,
    emergenciaDesde: a.emergencia_desde,
    previstoIngressoP50: a.previsto_ingresso_p50,
    previstoIngressoP90: a.previsto_ingresso_p90,
    esperaAtualP50: a.espera_atual_p50,
    esperaAtualP90: a.espera_atual_p90,
    estimativaDegradada: a.estimativa_degradada,
    inicioPrevisto: a.inicio_previsto,
    inicioReal: a.inicio_real,
    fimReal: a.fim_real,
    realizadoMinutos: a.realizado_minutos,
    esperaRealizadaMinutos: a.espera_realizada_minutos,
    erroMinutos: a.erro_minutos,
    erroAbsolutoMinutos: a.erro_absoluto_minutos,
    suspeita: a.suspeita,
    linkToken: a.link_token,
    criadoEm: a.criado_em,
  };

  await db
    .insert(atendimentos)
    .values(valores)
    .onConflictDoUpdate({
      target: atendimentos.id,
      set: {
        animalId: valores.animalId,
        agendamentoId: valores.agendamentoId,
        origem: valores.origem,
        especie: valores.especie,
        porte: valores.porte,
        tipo: valores.tipo,
        reativo: valores.reativo,
        suspeitaInfectocontagiosa: valores.suspeitaInfectocontagiosa,
        marcadorCio: valores.marcadorCio,
        estado: valores.estado,
        emergencia: valores.emergencia,
        emergenciaDesde: valores.emergenciaDesde,
        previstoIngressoP50: valores.previstoIngressoP50,
        previstoIngressoP90: valores.previstoIngressoP90,
        esperaAtualP50: valores.esperaAtualP50,
        esperaAtualP90: valores.esperaAtualP90,
        estimativaDegradada: valores.estimativaDegradada,
        inicioPrevisto: valores.inicioPrevisto,
        inicioReal: valores.inicioReal,
        fimReal: valores.fimReal,
        realizadoMinutos: valores.realizadoMinutos,
        esperaRealizadaMinutos: valores.esperaRealizadaMinutos,
        erroMinutos: valores.erroMinutos,
        erroAbsolutoMinutos: valores.erroAbsolutoMinutos,
        suspeita: valores.suspeita,
        linkToken: valores.linkToken,
      },
    });
}

export async function listarEncerrados(filtro?: {
  dia?: string;
  tipo?: TipoAtendimento;
}): Promise<AtendimentoMemoria[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.estado, "encerrado"));

  return rows
    .map(rowParaAtendimento)
    .filter((a) => {
      if (!a.fim_real) return false;
      if (filtro?.tipo && a.tipo !== filtro.tipo) return false;
      if (filtro?.dia) {
        const dia = a.fim_real.toISOString().slice(0, 10);
        if (dia !== filtro.dia) return false;
      }
      return true;
    });
}

export async function serieAtual(): Promise<SeriePorTipo> {
  const db = getDb();
  const rows = await db.select().from(serieCampo);
  const serie: SeriePorTipo = {};
  for (const amostra of rows) {
    const tipo = amostra.tipo as TipoAtendimento;
    const lista = serie[tipo] ?? [];
    lista.push(amostra.duracaoMinutos);
    serie[tipo] = lista;
  }
  return serie;
}

export async function definirSerie(
  novas: AmostraMemoria[],
  substituir = true,
): Promise<void> {
  const db = getDb();
  if (substituir) {
    await db.delete(serieCampo);
  }
  if (novas.length === 0) return;
  await db.insert(serieCampo).values(
    novas.map((a) => ({
      tipo: a.tipo,
      duracaoMinutos: a.duracao_minutos,
      origem: a.origem,
      inicio: a.inicio,
      fim: a.fim,
    })),
  );
}

export async function adicionarAmostra(amostra: AmostraMemoria): Promise<void> {
  const db = getDb();
  await db.insert(serieCampo).values({
    tipo: amostra.tipo,
    duracaoMinutos: amostra.duracao_minutos,
    origem: amostra.origem,
    inicio: amostra.inicio,
    fim: amostra.fim,
  });
}

export async function listarAmostras(): Promise<AmostraMemoria[]> {
  const db = getDb();
  const rows = await db.select().from(serieCampo);
  return rows.map((a) => ({
    id: a.id,
    tipo: a.tipo as TipoAtendimento,
    duracao_minutos: a.duracaoMinutos,
    origem: a.origem as AmostraMemoria["origem"],
    inicio: a.inicio,
    fim: a.fim,
  }));
}

/** Recursos derivados dos atendimentos abertos (sem tabela paralela). */
export async function derivarEstadoRecursos(): Promise<{
  veterinario: "livre" | "ocupado";
  salaIsolamento: "livre" | "ocupado";
  atendimentoAtualId: string | null;
  ocupanteSalaId: string | null;
}> {
  const abertos = await listarAguardandoOuEmCurso();
  const emCurso = abertos.find((a) => a.estado === "em_atendimento");
  const naSala = abertos.find(
    (a) =>
      a.suspeita_infectocontagiosa &&
      (a.estado === "em_atendimento" || a.estado === "aguardando_sala"),
  );
  return {
    veterinario: emCurso ? "ocupado" : "livre",
    salaIsolamento: naSala ? "ocupado" : "livre",
    atendimentoAtualId: emCurso?.id ?? null,
    ocupanteSalaId: naSala?.id ?? null,
  };
}

export async function listarAguardandoNaFila(): Promise<AtendimentoMemoria[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(atendimentos)
    .where(
      and(
        eq(atendimentos.estado, "aguardando"),
        eq(atendimentos.origem, "chegada"),
      ),
    );
  return rows.map(rowParaAtendimento);
}
