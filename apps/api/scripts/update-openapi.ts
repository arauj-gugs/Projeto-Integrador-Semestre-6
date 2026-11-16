import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "../src/app.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const outPath = join(root, "docs/contratos/openapi.json");

const app = await buildApp();
await app.ready();
const spec = app.swagger() as { paths?: Record<string, unknown> };
const paths = { ...(spec.paths ?? {}) };
for (const p of Object.keys(paths)) {
  if (p.startsWith("/dev")) delete paths[p];
}
writeFileSync(outPath, `${JSON.stringify({ ...spec, paths }, null, 2)}\n`, "utf8");
await app.close();
console.log("openapi ok", Object.keys(paths).length, outPath);
