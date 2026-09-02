import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AgentsModule } from "./agents/agents.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, AgentsModule],
})
export class AppModule {}
