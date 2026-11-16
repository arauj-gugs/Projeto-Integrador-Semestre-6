import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";

const openapiPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/contratos/openapi.json",
);

/** Remove rotas /dev/* (localhost-only) do spec gerado. */
function semRotasDev(spec: {
  paths?: Record<string, unknown>;
}): typeof spec {
  if (!spec.paths) return spec;
  const paths = { ...spec.paths };
  for (const p of Object.keys(paths)) {
    if (p.startsWith("/dev")) delete paths[p];
  }
  return { ...spec, paths };
}

describe("OpenAPI congelado (issue #9)", () => {
  it("o spec gerado pela API bate com docs/contratos/openapi.json", async () => {
    const app = await buildApp();
    await app.ready();

    const gerado = semRotasDev(app.swagger() as { paths?: Record<string, unknown> });
    const congelado = JSON.parse(readFileSync(openapiPath, "utf8")) as unknown;

    expect(gerado).toEqual(congelado);
    await app.close();
  });
});
