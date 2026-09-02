import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { AgentsService } from "./agents.service";
import { InvokeAgentDto } from "./dto/invoke-agent.dto";

@Controller("agents")
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post("invoke")
  async invoke(@Body() dto: InvokeAgentDto, @Res() res: Response): Promise<void> {
    const { status, data } = await this.agentsService.invoke(dto);
    res.status(status).json(data);
  }
}
