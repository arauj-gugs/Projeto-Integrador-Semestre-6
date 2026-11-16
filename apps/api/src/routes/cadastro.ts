import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  especieSchema,
  tipoAtendimentoSchema,
} from "@fila-virtual/contratos";
import {
  criarAgendamento,
  criarAnimal,
  criarTutor,
  listarAgendamentos,
  listarAnimais,
  listarPesos,
  listarTutores,
  marcarAgendamentoCheckIn,
  obterAgendamento,
  obterAnimal,
  obterTutor,
  obterTutorPorCredencial,
  registrarPeso,
  registrarTermo,
} from "../store/cadastro.js";
import { criarAtendimento } from "../fila/memoria.js";
import { AtendimentoNaoEncontrado } from "../fila/erros-dominio.js";
import { exigirEquipe, exigirEquipeOuDono } from "../auth/prontuario.js";

const tutorBody = z
  .object({
    nome: z.string().min(1),
    telefone: z.string().min(8),
  })
  .strict();

const animalBody = z
  .object({
    tutor_id: z.string().uuid(),
    nome: z.string().min(1),
    especie_fila: especieSchema,
    especie_detalhe: z.string().nullable().optional(),
    porte: z.string().min(1),
    sexo: z.string().nullable().optional(),
    castrado: z.boolean().nullable().optional(),
    raca: z.string().nullable().optional(),
    nascido_em: z.string().datetime().nullable().optional(),
  })
  .strict();

const pesoBody = z
  .object({
    kg: z.number().int().positive(),
    medido_em: z.string().datetime().optional(),
  })
  .strict();

const termoBody = z
  .object({
    tutor_id: z.string().uuid(),
    animal_id: z.string().uuid().nullable().optional(),
    finalidade: z.string().min(1),
  })
  .strict();

const agendamentoBody = z
  .object({
    animal_id: z.string().uuid(),
    tipo: tipoAtendimentoSchema,
    inicio_em: z.string().datetime(),
    duracao_minutos: z.number().int().positive(),
  })
  .strict();

const ingressoAnimalBody = z
  .object({
    tipo_atendimento: tipoAtendimentoSchema,
    marcadores: z.array(z.enum(["reativo", "cio", "isolamento"])),
  })
  .strict();

const acessoDonoBody = z
  .object({
    telefone: z.string().min(8),
    pin: z.string().min(4),
  })
  .strict();

function semPinParaDono<T extends { pinAcesso?: string }>(row: T): Omit<T, "pinAcesso"> {
  const { pinAcesso: _, ...resto } = row;
  return resto;
}

export async function registerCadastro(app: FastifyInstance): Promise<void> {
  app.post("/tutor/acesso", async (request, reply) => {
    const parsed = acessoDonoBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ erros: parsed.error.issues });
    }
    const tutor = await obterTutorPorCredencial(
      parsed.data.telefone,
      parsed.data.pin,
    );
    if (!tutor) {
      return reply.status(401).send({
        codigo: 401,
        mensagem: "telefone ou pin invalidos",
      });
    }
    const animais = await listarAnimais(tutor.id);
    return {
      tutor_id: tutor.id,
      nome: tutor.nome,
      telefone: tutor.telefone,
      animais,
    };
  });

  app.post("/tutores", async (request, reply) => {
    const auth = exigirEquipe(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    const parsed = tutorBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ erros: parsed.error.issues });
    }
    const tutor = await criarTutor(parsed.data);
    return reply.status(201).send(tutor);
  });

  app.get("/tutores", async (request, reply) => {
    const auth = await exigirEquipeOuDono(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    if (auth.papel === "dono") {
      const tutor = await obterTutor(auth.tutorId);
      if (!tutor) {
        return reply.status(404).send({ codigo: 404, mensagem: "tutor nao encontrado" });
      }
      return [semPinParaDono(tutor)];
    }
    const todos = await listarTutores();
    return todos.map(semPinParaDono);
  });

  app.get<{ Params: { id: string } }>("/tutores/:id", async (request, reply) => {
    const auth = await exigirEquipeOuDono(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    if (auth.papel === "dono" && auth.tutorId !== request.params.id) {
      return reply.status(403).send({
        codigo: 403,
        mensagem: "dono so acessa o proprio cadastro",
      });
    }
    const tutor = await obterTutor(request.params.id);
    if (!tutor) {
      return reply.status(404).send({ codigo: 404, mensagem: "tutor nao encontrado" });
    }
    return semPinParaDono(tutor);
  });

  app.post("/animais", async (request, reply) => {
    const auth = exigirEquipe(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    const parsed = animalBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ erros: parsed.error.issues });
    }
    if (
      parsed.data.porte === "grande" &&
      (!parsed.data.especie_detalhe?.trim() ||
        parsed.data.especie_fila !== "silvestre")
    ) {
      return reply.status(422).send([
        {
          codigo: 422,
          campo: "especie_detalhe",
          mensagem:
            "grande exige especie_fila=silvestre e detalhe (ex.: cavalo, boi)",
        },
      ]);
    }
    const tutor = await obterTutor(parsed.data.tutor_id);
    if (!tutor) {
      return reply.status(404).send({ codigo: 404, mensagem: "tutor nao encontrado" });
    }
    try {
      const animal = await criarAnimal(parsed.data);
      return reply.status(201).send(animal);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("grande_")) {
        return reply.status(422).send([
          {
            codigo: 422,
            campo: "porte",
            mensagem: err.message,
          },
        ]);
      }
      throw err;
    }
  });

  app.get("/animais", async (request, reply) => {
    const auth = await exigirEquipeOuDono(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    if (auth.papel === "dono") {
      return listarAnimais(auth.tutorId);
    }
    const q = request.query as { tutor_id?: string };
    return listarAnimais(q.tutor_id);
  });

  app.get<{ Params: { id: string } }>("/animais/:id", async (request, reply) => {
    const auth = await exigirEquipeOuDono(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    const animal = await obterAnimal(request.params.id);
    if (!animal) {
      return reply.status(404).send({ codigo: 404, mensagem: "animal nao encontrado" });
    }
    if (auth.papel === "dono" && animal.tutorId !== auth.tutorId) {
      return reply.status(403).send({
        codigo: 403,
        mensagem: "dono so acessa o proprio animal",
      });
    }
    return animal;
  });

  app.post<{ Params: { id: string } }>(
    "/animais/:id/pesos",
    async (request, reply) => {
      const auth = exigirEquipe(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }
      const animal = await obterAnimal(request.params.id);
      if (!animal) {
        return reply.status(404).send({ codigo: 404, mensagem: "animal nao encontrado" });
      }
      const parsed = pesoBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({ erros: parsed.error.issues });
      }
      const peso = await registrarPeso(
        request.params.id,
        parsed.data.kg,
        parsed.data.medido_em ? new Date(parsed.data.medido_em) : undefined,
      );
      return reply.status(201).send(peso);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/animais/:id/pesos",
    async (request, reply) => {
      const auth = await exigirEquipeOuDono(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }
      const animal = await obterAnimal(request.params.id);
      if (!animal) {
        return reply.status(404).send({ codigo: 404, mensagem: "animal nao encontrado" });
      }
      if (auth.papel === "dono" && animal.tutorId !== auth.tutorId) {
        return reply.status(403).send({
          codigo: 403,
          mensagem: "dono so acessa o proprio animal",
        });
      }
      return listarPesos(request.params.id);
    },
  );

  app.post("/termos", async (request, reply) => {
    const auth = exigirEquipe(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    const parsed = termoBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ erros: parsed.error.issues });
    }
    const tutor = await obterTutor(parsed.data.tutor_id);
    if (!tutor) {
      return reply.status(404).send({ codigo: 404, mensagem: "tutor nao encontrado" });
    }
    const termo = await registrarTermo(parsed.data);
    return reply.status(201).send(termo);
  });

  app.post("/agendamentos", async (request, reply) => {
    const auth = exigirEquipe(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    const parsed = agendamentoBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ erros: parsed.error.issues });
    }
    const animal = await obterAnimal(parsed.data.animal_id);
    if (!animal) {
      return reply.status(404).send({ codigo: 404, mensagem: "animal nao encontrado" });
    }
    const agendamento = await criarAgendamento(parsed.data);
    return reply.status(201).send(agendamento);
  });

  app.get("/agendamentos", async (request, reply) => {
    const auth = await exigirEquipeOuDono(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    if (auth.papel === "dono") {
      return listarAgendamentos(auth.tutorId);
    }
    return listarAgendamentos();
  });

  /** Check-in de agenda: vira atendimento origem=agendado (não entra na fila walk-in). */
  app.post<{ Params: { id: string } }>(
    "/agendamentos/:id/check-in",
    async (request, reply) => {
      const auth = exigirEquipe(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }
      const agendamento = await obterAgendamento(request.params.id);
      if (!agendamento) {
        return reply
          .status(404)
          .send({ codigo: 404, mensagem: "agendamento nao encontrado" });
      }
      if (agendamento.estado !== "marcado") {
        return reply.status(409).send({
          codigo: 409,
          mensagem: "agendamento ja teve check-in",
        });
      }
      const animal = await obterAnimal(agendamento.animalId);
      if (!animal) {
        throw new AtendimentoNaoEncontrado();
      }

      const ingresso = await criarAtendimento(
        {
          especie: animal.especieFila as "cao" | "gato" | "silvestre",
          porte: animal.porte,
          tipo_atendimento: agendamento.tipo as
            | "consulta"
            | "vacina"
            | "ultrassom"
            | "raio-x"
            | "coleta"
            | "castracao"
            | "cirurgia"
            | "emergencia",
          marcadores: [],
        },
        {
          animal_id: animal.id,
          agendamento_id: agendamento.id,
          origem: "agendado",
        },
      );

      await marcarAgendamentoCheckIn(agendamento.id);
      return reply.status(201).send({
        agendamento_id: agendamento.id,
        atendimento: ingresso,
      });
    },
  );

  /** Walk-in com animal cadastrado — grandes só por agenda. */
  app.post<{ Params: { id: string } }>(
    "/animais/:id/atendimentos",
    async (request, reply) => {
      const auth = exigirEquipe(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }
      const animal = await obterAnimal(request.params.id);
      if (!animal) {
        return reply.status(404).send({ codigo: 404, mensagem: "animal nao encontrado" });
      }
      if (animal.porte === "grande") {
        return reply.status(422).send([
          {
            codigo: 422,
            campo: "porte",
            mensagem: "grandes so por agenda",
          },
        ]);
      }
      const parsed = ingressoAnimalBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({ erros: parsed.error.issues });
      }
      const body = await criarAtendimento(
        {
          especie: animal.especieFila as "cao" | "gato" | "silvestre",
          porte: animal.porte,
          tipo_atendimento: parsed.data.tipo_atendimento,
          marcadores: parsed.data.marcadores,
        },
        { animal_id: animal.id, origem: "chegada" },
      );
      return reply.status(201).send(body);
    },
  );
}
