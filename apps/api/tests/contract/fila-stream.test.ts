import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SnapshotFila } from "../../src/fila/snapshot-fila.js";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";
import type { FastifyInstance } from "fastify";

const ingressoValido = {
  especie: "cao",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

function extrairEventosDoBuffer(buffer: string): {
  eventos: SnapshotFila[];
  resto: string;
} {
  const eventos: SnapshotFila[] = [];
  let resto = buffer;
  for (;;) {
    const fim = resto.indexOf("\n\n");
    if (fim < 0) {
      break;
    }
    const bloco = resto.slice(0, fim);
    resto = resto.slice(fim + 2);
    const linhaData = bloco
      .split("\n")
      .find((linha) => linha.startsWith("data: "));
    if (linhaData) {
      eventos.push(JSON.parse(linhaData.slice(6)) as SnapshotFila);
    }
  }
  return { eventos, resto };
}

class ClienteSse {
  private buffer = "";
  private fila: SnapshotFila[] = [];
  private esperando: Array<(e: SnapshotFila) => void> = [];

  constructor(private readonly res: http.IncomingMessage) {
    res.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const { eventos, resto } = extrairEventosDoBuffer(this.buffer);
      this.buffer = resto;
      for (const evento of eventos) {
        if (this.esperando.length > 0) {
          this.esperando.shift()!(evento);
        } else {
          this.fila.push(evento);
        }
      }
    });
  }

  async proximoEvento(timeoutMs = 10_000): Promise<SnapshotFila> {
    if (this.fila.length > 0) {
      return this.fila.shift()!;
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("timeout aguardando evento SSE")),
        timeoutMs,
      );
      this.esperando.push((evento) => {
        clearTimeout(timer);
        resolve(evento);
      });
    });
  }

  encerrar(): void {
    this.res.destroy();
  }
}

function conectarSse(port: number): Promise<ClienteSse> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/fila/stream`, (res) => {
      resolve(new ClienteSse(res));
    });
    req.on("error", reject);
  });
}

function obterPorta(app: FastifyInstance): number {
  const addr = app.server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("servidor sem endereco");
  }
  return addr.port;
}

function percentil95(valores: number[]): number {
  const ordenado = [...valores].sort((a, b) => a - b);
  const indice = Math.ceil(0.95 * ordenado.length) - 1;
  return ordenado[Math.max(0, indice)]!;
}

async function postJson(
  port: number,
  path: string,
  payload?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const body = payload !== undefined ? JSON.stringify(payload) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
      },
      (res) => {
        let dados = "";
        res.on("data", (c) => {
          dados += c;
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: dados ? JSON.parse(dados) : null,
          });
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

describe("GET /fila/stream (SSE, RNF-02, issue #31)", () => {
  let app: FastifyInstance;
  let port: number;

  beforeEach(async () => {
    await resetMemoriaFila();
    app = await buildApp();
    await app.listen({ port: 0, host: "127.0.0.1" });
    port = obterPorta(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it("envia snapshot inicial e incrementa versao apos ingresso", async () => {
    const cliente = await conectarSse(port);
    const inicial = await cliente.proximoEvento();
    expect(inicial.versao).toBe(0);
    expect(inicial.cabecas).toEqual([]);

    const resposta = await postJson(port, "/atendimentos", ingressoValido);
    expect(resposta.status).toBe(201);

    const apos = await cliente.proximoEvento();
    expect(apos.versao).toBeGreaterThan(inicial.versao);
    expect(apos.cabecas.length).toBe(1);

    cliente.encerrar();
  });

  it("dois clientes recebem a mesma versao apos uma mudanca", async () => {
    const c1 = await conectarSse(port);
    const c2 = await conectarSse(port);
    await c1.proximoEvento();
    await c2.proximoEvento();

    await postJson(port, "/atendimentos", ingressoValido);

    const [e1, e2] = await Promise.all([
      c1.proximoEvento(),
      c2.proximoEvento(),
    ]);
    expect(e1.versao).toBe(e2.versao);

    c1.encerrar();
    c2.encerrar();
  });

  it("p95 da latencia <= 5s em 50 ingressos consecutivos", async () => {
    const cliente = await conectarSse(port);
    let ultimaVersao = (await cliente.proximoEvento()).versao;
    const latencias: number[] = [];

    for (let i = 0; i < 50; i += 1) {
      const t0 = Date.now();
      const resposta = await postJson(port, "/atendimentos", ingressoValido);
      expect(resposta.status).toBe(201);

      let evento: SnapshotFila;
      do {
        evento = await cliente.proximoEvento();
      } while (evento.versao <= ultimaVersao);

      ultimaVersao = evento.versao;
      latencias.push(Date.now() - t0);
    }

    const p95 = percentil95(latencias);
    expect(p95).toBeLessThanOrEqual(5000);

    cliente.encerrar();
  });
});