import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import { LLMProvider, LLMRequest, LLMResponse } from './provider';
import { LLMConfig } from '../config/schema';
import { LLMError } from '../utils/errors';
import { withRetry, isRetryableHttpError } from '../utils/retry';
import { logger } from '../utils/logger';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  private config: LLMConfig | null = null;

  initialize(config: LLMConfig): void {
    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  isAvailable(): boolean {
    return this.client !== null && this.config !== null;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client || !this.config) {
      throw new LLMError('Gemini provider not initialized. Call initialize() first.');
    }

    const maxTokens = request.maxTokens || this.config.maxTokens;
    const temperature = request.temperature ?? this.config.temperature;

    return withRetry(
      async () => {
        try {
          const model = this.client!.getGenerativeModel({
            model: this.config!.model,
            systemInstruction: request.systemPrompt,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
          });

          const result: GenerateContentResult = await model.generateContent(request.userPrompt);
          const response = result.response;
          const content = response.text();

          // Extract token usage from response metadata
          const usageMetadata = response.usageMetadata;
          const inputTokens = usageMetadata?.promptTokenCount || 0;
          const outputTokens = usageMetadata?.candidatesTokenCount || 0;

          return {
            content,
            usage: {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
            },
            model: this.config!.model,
            finishReason: response.candidates?.[0]?.finishReason || 'unknown',
          };
        } catch (error: any) {
          const status = error?.status || error?.httpStatusCode;
          const message = error?.message || String(error);

          if (status === 401 || status === 403 || message.includes('API_KEY_INVALID')) {
            throw new LLMError(
              'Invalid API key.',
              401,
              'Check your GEMINI_API_KEY in .env file.\n' +
                'Get your API key at: https://aistudio.google.com/apikey'
            );
          }

          if (status === 429) {
            throw new LLMError(
              'Rate limited by Gemini API.',
              429,
              'Too many requests. The CLI will retry with exponential backoff.'
            );
          }

          if (status === 503 || status === 529) {
            throw new LLMError(
              'Gemini API is overloaded.',
              status,
              'The API is under heavy load. The CLI will retry automatically.'
            );
          }

          throw new LLMError(
            `Gemini API error: ${message}`,
            status,
            'Check the Google AI Studio status page.'
          );
        }
      },
      {
        maxRetries: this.config.retries,
        baseDelay: 2000,
        maxDelay: 60000,
        shouldRetry: (error) => {
          if (error instanceof LLMError && error.statusCode === 401) {
            return false;
          }
          return isRetryableHttpError(error);
        },
      }
    );
  }
}
