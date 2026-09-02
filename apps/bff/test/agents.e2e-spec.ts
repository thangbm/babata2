import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../src/app.module";

describe("POST /api/agents/invoke (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects a missing input field with 400", async () => {
    await request(httpServer).post("/api/agents/invoke").send({}).expect(400);
  });

  it("maps an unreachable upstream to 502 { error }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed")));

    const res = await request(httpServer)
      .post("/api/agents/invoke")
      .send({ input: "hi" })
      .expect(502);

    expect(res.body).toEqual({ error: "fetch failed" });
  });
});
