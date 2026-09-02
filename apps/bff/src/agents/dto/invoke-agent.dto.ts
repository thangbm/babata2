import { IsNotEmpty, IsString } from "class-validator";

export class InvokeAgentDto {
  @IsString()
  @IsNotEmpty()
  input!: string;
}
