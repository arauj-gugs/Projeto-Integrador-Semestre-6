import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";
import {
  hostLocal,
  hostnameDoHostHeader,
} from "../../src/http/host-local.js";

describe("hostLocal / hostnameDoHostHeader", () => {
  it("reconhece localhost e IPv4 com porta", () => {
    expect(hostnameDoHostHeader("localhost:3000")).toBe("localhost");
    expect(hostnameDoHostHeader("127.0.0.1:3000")).toBe("127.0.0.1");
    expect(hostLocal("localhost:3000")).toBe(true);
    expect(hostLocal("127.0.0.1:3000")).toBe(true);
  });

  it("reconhece IPv6 loopback com brackets", () => {
    expect(hostnameDoHostHeader("[::1]:3000")).toBe("::1");
    expect(hostnameDoHostHeader("[::1]")).toBe("::1");
    expect(hostLocal("[::1]:3000")).toBe(true);
    expect(hostLocal("[::1]")).toBe(true);
  });

  it("rejeita host remoto", () => {
    expect(hostLocal("example.com:443")).toBe(false);
    expect(hostLocal("192.168.0.1:3000")).toBe(false);
  });
});

describe("POST /dev/reset com Host IPv6", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("aceita Host [::1]:3000", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/dev/reset",
      headers: { host: "[::1]:3000" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
