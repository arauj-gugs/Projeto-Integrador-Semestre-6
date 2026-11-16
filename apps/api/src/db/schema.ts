import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Tutor (dono) — prontuário simulado da clínica. */
export const tutores = pgTable("tutores", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  /** Obrigatório: acesso do dono = telefone + pin. */
  telefone: text("telefone").notNull(),
  /** PIN gerado no cadastro (demo local; texto simples). */
  pinAcesso: text("pin_acesso").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Animal do prontuário.
 * especie_fila: cao | gato | silvestre (enum congelado da fila).
 * especie_detalhe: texto livre (ex.: passarinho) para o cadastro.
 */
export const animais = pgTable("animais", {
  id: uuid("id").defaultRandom().primaryKey(),
  tutorId: uuid("tutor_id")
    .notNull()
    .references(() => tutores.id),
  nome: text("nome").notNull(),
  especieFila: text("especie_fila").notNull(),
  especieDetalhe: text("especie_detalhe"),
  porte: text("porte").notNull(),
  sexo: text("sexo"),
  castrado: boolean("castrado"),
  raca: text("raca"),
  nascidoEm: timestamp("nascido_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Histórico de pesagem (uma linha por medição). */
export const pesos = pgTable("pesos", {
  id: uuid("id").defaultRandom().primaryKey(),
  animalId: uuid("animal_id")
    .notNull()
    .references(() => animais.id),
  kg: integer("kg").notNull(),
  medidoEm: timestamp("medido_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Termo de consentimento do tutor. */
export const termosConsentimento = pgTable("termos_consentimento", {
  id: uuid("id").defaultRandom().primaryKey(),
  tutorId: uuid("tutor_id")
    .notNull()
    .references(() => tutores.id),
  animalId: uuid("animal_id").references(() => animais.id),
  finalidade: text("finalidade").notNull(),
  aceitoEm: timestamp("aceito_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Agenda de grandes e cirurgia.
 * Não entra na fila walk-in; check-in vira atendimento com origem=agendado.
 */
export const agendamentos = pgTable("agendamentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  animalId: uuid("animal_id")
    .notNull()
    .references(() => animais.id),
  tipo: text("tipo").notNull(),
  inicioEm: timestamp("inicio_em", { withTimezone: true }).notNull(),
  duracaoMinutos: integer("duracao_minutos").notNull(),
  estado: text("estado").notNull().default("marcado"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tabelas da F1/F3.
 * Sem coordenadas (RNF-01, C-07). Nome de tutor/animal fica nas tabelas acima.
 */
export const atendimentos = pgTable("atendimentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: text("codigo").notNull(),
  animalId: uuid("animal_id").references(() => animais.id),
  agendamentoId: uuid("agendamento_id").references(() => agendamentos.id),
  /** chegada (walk-in) | agendado */
  origem: text("origem").notNull().default("chegada"),
  especie: text("especie").notNull(),
  porte: text("porte").notNull(),
  tipo: text("tipo").notNull(),
  reativo: boolean("reativo").notNull().default(false),
  suspeitaInfectocontagiosa: boolean("suspeita_infectocontagiosa")
    .notNull()
    .default(false),
  /** cio | isolamento | null — além dos booleans acima */
  marcadorCio: boolean("marcador_cio").notNull().default(false),
  /** aguardando | aguardando_sala | em_atendimento | encerrado */
  estado: text("estado").notNull().default("aguardando"),
  emergencia: boolean("emergencia").notNull().default(false),
  emergenciaDesde: integer("emergencia_desde"),
  previstoIngressoP50: integer("previsto_ingresso_p50"),
  previstoIngressoP90: integer("previsto_ingresso_p90"),
  esperaAtualP50: integer("espera_atual_p50"),
  esperaAtualP90: integer("espera_atual_p90"),
  estimativaDegradada: boolean("estimativa_degradada").notNull().default(false),
  inicioPrevisto: timestamp("inicio_previsto", { withTimezone: true }),
  inicioReal: timestamp("inicio_real", { withTimezone: true }),
  fimReal: timestamp("fim_real", { withTimezone: true }),
  realizadoMinutos: integer("realizado_minutos"),
  esperaRealizadaMinutos: integer("espera_realizada_minutos"),
  erroMinutos: integer("erro_minutos"),
  erroAbsolutoMinutos: integer("erro_absoluto_minutos"),
  suspeita: boolean("suspeita").notNull().default(false),
  linkToken: text("link_token").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const serieCampo = pgTable("serie_campo", {
  id: uuid("id").defaultRandom().primaryKey(),
  tipo: text("tipo").notNull(),
  duracaoMinutos: integer("duracao_minutos").notNull(),
  origem: text("origem").notNull(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }).notNull(),
});

/** Log da fila: ingresso, chamado, aguardando_sala, emergencia, encerrado. */
export const filaEventos = pgTable("fila_eventos", {
  id: uuid("id").defaultRandom().primaryKey(),
  atendimentoId: uuid("atendimento_id")
    .notNull()
    .references(() => atendimentos.id),
  tipo: text("tipo").notNull(),
  detalhe: text("detalhe"),
  em: timestamp("em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Estado de acionamento F2.
 * Guarda faixa/tempo; nunca latitude/longitude (ADR-001).
 */
export const acionamentos = pgTable("acionamentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  atendimentoId: uuid("atendimento_id")
    .notNull()
    .references(() => atendimentos.id)
    .unique(),
  codigo: text("codigo").notNull(),
  linkToken: text("link_token").notNull().unique(),
  criterio: text("criterio").notNull().default("tempo_fixo"),
  faixa: text("faixa"),
  deslocamentoMinutos: integer("deslocamento_minutos"),
  faixaGravadaEm: timestamp("faixa_gravada_em", { withTimezone: true }),
  consentimento: jsonb("consentimento"),
  momentos: jsonb("momentos").notNull().default([]),
  semLink: boolean("sem_link").notNull().default(false),
  linkAberto: boolean("link_aberto").notNull().default(false),
  acionamento: jsonb("acionamento"),
  confirmacaoEm: timestamp("confirmacao_em", { withTimezone: true }),
  segundoCanalEm: timestamp("segundo_canal_em", { withTimezone: true }),
  alertaRecepcao: text("alerta_recepcao"),
});

/** Contador de códigos A001, A002… */
export const sequencias = pgTable("sequencias", {
  nome: text("nome").primaryKey(),
  valor: integer("valor").notNull().default(0),
});
