import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Tabelas da F1. Sem nome de tutor/animal e sem coordenadas (RNF-01, C-07). */
export const atendimentos = pgTable("atendimentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: text("codigo").notNull(),
  especie: text("especie").notNull(),
  porte: text("porte").notNull(),
  tipo: text("tipo").notNull(),
  reativo: boolean("reativo").notNull().default(false),
  suspeitaInfectocontagiosa: boolean("suspeita_infectocontagiosa")
    .notNull()
    .default(false),
  estado: text("estado").notNull().default("aguardando"),
  previstoP50: integer("previsto_p50"),
  previstoP90: integer("previsto_p90"),
  estimativaDegradada: boolean("estimativa_degradada").notNull().default(false),
  inicioPrevisto: timestamp("inicio_previsto", { withTimezone: true }),
  inicioReal: timestamp("inicio_real", { withTimezone: true }),
  fimReal: timestamp("fim_real", { withTimezone: true }),
  realizadoMinutos: integer("realizado_minutos"),
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
