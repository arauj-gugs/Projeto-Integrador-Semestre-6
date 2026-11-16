/**
 * Smoke de integração — PostgreSQL acessível (issue #66).
 * Substitua por suítes API + drizzle (RF-09, RF-11, RNF-01) quando `apps/api/src/db/` existir.
 */
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/fila_virtual_test";

describe("integration — PostgreSQL", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("responde SELECT 1", async () => {
    const { rows } = await client.query("SELECT 1 AS ok");
    expect(rows[0]?.ok).toBe(1);
  });
});