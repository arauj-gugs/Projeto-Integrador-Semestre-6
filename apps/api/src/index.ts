import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

const app = await buildApp();

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API em http://localhost:${port}`);
  console.log(`OpenAPI em http://localhost:${port}/docs`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
