CREATE TABLE "acionamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atendimento_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"link_token" text NOT NULL,
	"criterio" text DEFAULT 'tempo_fixo' NOT NULL,
	"faixa" text,
	"deslocamento_minutos" integer,
	"faixa_gravada_em" timestamp with time zone,
	"consentimento" jsonb,
	"momentos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sem_link" boolean DEFAULT false NOT NULL,
	"link_aberto" boolean DEFAULT false NOT NULL,
	"acionamento" jsonb,
	"confirmacao_em" timestamp with time zone,
	"segundo_canal_em" timestamp with time zone,
	"alerta_recepcao" text,
	CONSTRAINT "acionamentos_atendimento_id_unique" UNIQUE("atendimento_id"),
	CONSTRAINT "acionamentos_link_token_unique" UNIQUE("link_token")
);
--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"inicio_em" timestamp with time zone NOT NULL,
	"duracao_minutos" integer NOT NULL,
	"estado" text DEFAULT 'marcado' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"especie_fila" text NOT NULL,
	"especie_detalhe" text,
	"porte" text NOT NULL,
	"sexo" text,
	"castrado" boolean,
	"raca" text,
	"nascido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atendimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"animal_id" uuid,
	"agendamento_id" uuid,
	"origem" text DEFAULT 'chegada' NOT NULL,
	"especie" text NOT NULL,
	"porte" text NOT NULL,
	"tipo" text NOT NULL,
	"reativo" boolean DEFAULT false NOT NULL,
	"suspeita_infectocontagiosa" boolean DEFAULT false NOT NULL,
	"marcador_cio" boolean DEFAULT false NOT NULL,
	"estado" text DEFAULT 'aguardando' NOT NULL,
	"emergencia" boolean DEFAULT false NOT NULL,
	"emergencia_desde" integer,
	"previsto_ingresso_p50" integer,
	"previsto_ingresso_p90" integer,
	"espera_atual_p50" integer,
	"espera_atual_p90" integer,
	"estimativa_degradada" boolean DEFAULT false NOT NULL,
	"inicio_previsto" timestamp with time zone,
	"inicio_real" timestamp with time zone,
	"fim_real" timestamp with time zone,
	"realizado_minutos" integer,
	"espera_realizada_minutos" integer,
	"erro_minutos" integer,
	"erro_absoluto_minutos" integer,
	"suspeita" boolean DEFAULT false NOT NULL,
	"link_token" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fila_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atendimento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"detalhe" text,
	"em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pesos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"kg" integer NOT NULL,
	"medido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequencias" (
	"nome" text PRIMARY KEY NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serie_campo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"duracao_minutos" integer NOT NULL,
	"origem" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "termos_consentimento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"animal_id" uuid,
	"finalidade" text NOT NULL,
	"aceito_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acionamentos" ADD CONSTRAINT "acionamentos_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animais" ADD CONSTRAINT "animais_tutor_id_tutores_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fila_eventos" ADD CONSTRAINT "fila_eventos_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "pesos_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termos_consentimento" ADD CONSTRAINT "termos_consentimento_tutor_id_tutores_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termos_consentimento" ADD CONSTRAINT "termos_consentimento_animal_id_animais_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animais"("id") ON DELETE no action ON UPDATE no action;