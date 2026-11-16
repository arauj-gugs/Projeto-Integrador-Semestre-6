import type { ServerResponse } from "node:http";
import { montarSnapshotFila, type SnapshotFila } from "./snapshot-fila.js";

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
  const snapshot = montarSnapshotFila(versaoAtual);
  escreverEvento(res, snapshot);
}

export function desinscreverCliente(res: ServerResponse): void {
  clientes.delete(res);
}

export function publicarMudancaFila(): SnapshotFila {
  versaoAtual += 1;
  const snapshot = montarSnapshotFila(versaoAtual);
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