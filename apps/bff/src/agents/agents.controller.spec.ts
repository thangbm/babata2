import { Test } from "@nestjs/testing";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";

describe("AgentsController", () => {
  it("writes the service result onto the response", async () => {
    const agentsService = {
      invoke: vi.fn().mockResolvedValue({ status: 201, data: { output: "ok" } }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: agentsService }],
    }).compile();
    const controller = moduleRef.get(AgentsController);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await controller.invoke({ input: "hi" }, res);

    expect(agentsService.invoke).toHaveBeenCalledWith({ input: "hi" });
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({ output: "ok" });
  });
});
