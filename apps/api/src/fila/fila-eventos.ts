import type { ServerResponse } from "node:http";
import { listarEstadosAcionamento } from "../acionamento/estado.js";
import { avaliarAcionamentos } from "../acionamento/motor.js";
import { obterAtendimento } from "../store/memoria.js";
import { montarSnapshotFila, type SnapshotFila } from "./snapshot-fila.js";
import { obterRegistro } from "./registro.js";

let versaoAtual = 0;
const clientes = new Set<ServerResponse>();

function formatarEventoSse(snapshot: SnapshotFila): string {
  return `event: fila-atualizada\ndata: ${JSON.stringify(snapshot)}\n\n`;
}

function escreverEvento(res: ServerResponse, snapshot: SnapshotFila): void {
  if (res.destroyed || res.writableEnded) {
    return;
  }
  res.write(formatarEventoSse(snapshot));
}

export function obterVersaoAtual(): number {
  return versaoAtual;
}

export function inscreverCliente(res: ServerResponse): void {
  clientes.add(res);
  void montarSnapshotFila(versaoAtual).then((snapshot) => {
    escreverEvento(res, snapshot);
  });
}

export function desinscreverCliente(res: ServerResponse): void {
  clientes.delete(res);
}

export async function publicarMudancaFila(): Promise<SnapshotFila> {
  versaoAtual += 1;

  const esperaCache = new Map<string, number | null>();
  for (const estado of listarEstadosAcionamento()) {
    const id = estado.atendimento_id;
    const espelho = await obterAtendimento(id);
    esperaCache.set(
      id,
      espelho?.espera_atual_p50 ??
        obterRegistro(id)?.estimativa_prevista.p50 ??
        null,
    );
  }

  await avaliarAcionamentos((id) => esperaCache.get(id) ?? null);

  const snapshot = await montarSnapshotFila(versaoAtual);
  for (const cliente of clientes) {
    escreverEvento(cliente, snapshot);
  }
  return snapshot;
}

export function resetHubFila(): void {
  for (const cliente of clientes) {
    if (!cliente.destroyed && !cliente.writableEnded) {
      cliente.end();
    }
  }
  clientes.clear();
  versaoAtual = 0;
}
