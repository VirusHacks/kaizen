import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMRequest, LLMResponse } from './provider';
import { LLMConfig } from '../config/schema';
import { LLMError } from '../utils/errors';
import { withRetry, isRetryableHttpError } from '../utils/retry';
import { logger } from '../utils/logger';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;
  private config: LLMConfig | null = null;

  initialize(config: LLMConfig): void {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }

  isAvailable(): boolean {
    return this.client !== null && this.config !== null;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client || !this.config) {
      throw new LLMError('Anthropic provider not initialized. Call initialize() first.');
    }

    const maxTokens = request.maxTokens || this.config.maxTokens;
    const temperature = request.temperature ?? this.config.temperature;

    return withRetry(
      async () => {
        try {
          const response = await this.client!.messages.create({
            model: this.config!.model,
            max_tokens: maxTokens,
            temperature,
            system: request.systemPrompt,
            messages: [
              {
                role: 'user',
                content: request.userPrompt,
              },
            ],
          });

          const content = response.content
            .filter((block) => block.type === 'text')
            .map((block) => (block as Anthropic.TextBlock).text)
            .join('\n');

          return {
            content,
            usage: {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            model: response.model,
            finishReason: response.stop_reason || 'unknown',
          };
        } catch (error: any) {
          if (error instanceof Anthropic.APIError) {
            const status = error.status;

            if (status === 401) {
              throw new LLMError(
                'Invalid API key.',
                401,
                'Check your ANTHROPIC_API_KEY in .env file.\n' +
                  'Get your API key at: https://console.anthropic.com/'
              );
            }

            if (status === 429) {
              throw new LLMError(
                'Rate limited by Anthropic API.',
                429,
                'Too many requests. The CLI will retry with exponential backoff.'
              );
            }

            if (status === 529) {
              throw new LLMError(
                'Anthropic API is overloaded.',
                529,
                'The API is under heavy load. The CLI will retry automatically.'
              );
            }

            throw new LLMError(
              `Anthropic API error: ${error.message}`,
              status,
              'Check the Anthropic API status page: https://status.anthropic.com/'
            );
          }

          throw error;
        }
      },
      {
        maxRetries: this.config.retries,
        baseDelay: 2000,
        maxDelay: 60000,
        shouldRetry: (error) => {
          if (error instanceof LLMError && error.statusCode === 401) {
            return false; // Don't retry auth errors
          }
          return isRetryableHttpError(error);
        },
      }
    );
  }
}
