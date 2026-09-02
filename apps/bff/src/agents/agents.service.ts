import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvokeAgentDto } from "./dto/invoke-agent.dto";

interface UpstreamResult {
  status: number;
  data: unknown;
}

/**
 * Proxies to the Python multi-agent AI service (services/brain).
 * Keep BFF-side validation/auth here; the AI service stays an internal
 * service that is not directly exposed to the browser.
 */
@Injectable()
export class AgentsService {
  constructor(private readonly configService: ConfigService) {}

  async invoke(dto: InvokeAgentDto): Promise<UpstreamResult> {
    const aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8000",
    );

    const upstream = await this.callUpstream(aiServiceUrl, dto);
    const data = await this.readBody(upstream);

    return { status: upstream.status, data };
  }

  private async callUpstream(aiServiceUrl: string, dto: InvokeAgentDto) {
    try {
      return await fetch(`${aiServiceUrl}/agents/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
    } catch (reason) {
      throw this.toBadGateway(reason);
    }
  }

  private async readBody(upstream: Awaited<ReturnType<typeof fetch>>) {
    try {
      return await upstream.json();
    } catch (reason) {
      throw this.toBadGateway(reason);
    }
  }

  private toBadGateway(reason: unknown): HttpException {
    const message = reason instanceof Error ? reason.message : "Unexpected error";
    return new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
  }
}
