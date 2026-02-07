import { LLMConfig } from '../config/schema';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMProvider {
  readonly name: string;
  initialize(config: LLMConfig): void;
  complete(request: LLMRequest): Promise<LLMResponse>;
  isAvailable(): boolean;
}

export class TokenTracker {
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private requestCount = 0;

  track(usage: TokenUsage): void {
    this.totalInputTokens += usage.inputTokens;
    this.totalOutputTokens += usage.outputTokens;
    this.requestCount++;
  }

  get stats() {
    return {
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      totalTokens: this.totalInputTokens + this.totalOutputTokens,
      requestCount: this.requestCount,
    };
  }

  reset(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.requestCount = 0;
  }
}
