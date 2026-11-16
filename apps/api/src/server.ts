/**
 * Entrada HTTP para deploy (Render #67). Testes usam buildApp + inject.
 */
import { buildApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildApp();

app.get("/health", async () => ({ ok: true, servico: "fila-virtual-api" }));

await app.listen({ port, host });