import { HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentsService } from "./agents.service";

describe("AgentsService", () => {
  let service: AgentsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: ConfigService, useValue: { get: () => "http://ai-service.test" } },
      ],
    }).compile();
    service = moduleRef.get(AgentsService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards the upstream status and body verbatim", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ output: "hello" }),
      }),
    );

    const result = await service.invoke({ input: "hi" });

    expect(result).toEqual({ status: 200, data: { output: "hello" } });
    expect(fetch).toHaveBeenCalledWith(
      "http://ai-service.test/agents/invoke",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("maps a network failure to a 502 HttpException with an { error } body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    try {
      await service.invoke({ input: "hi" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(502);
      expect((error as HttpException).getResponse()).toEqual({ error: "ECONNREFUSED" });
    }
  });

  it("maps an unparsable upstream body to a 502 HttpException", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.reject(new Error("Unexpected token")),
      }),
    );

    try {
      await service.invoke({ input: "hi" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(502);
    }
  });
});
