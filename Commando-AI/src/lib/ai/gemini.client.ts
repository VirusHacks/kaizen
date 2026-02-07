import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai'
import { AIConfig, DEFAULT_AI_CONFIG, AIError, AIErrorCode } from './ai.types'

/**
 * Gemini AI Client
 * Handles all communication with the Google Gemini API
 */
class GeminiClient {
  private client: GoogleGenerativeAI | null = null
  private model: GenerativeModel | null = null
  private config: AIConfig

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config }
  }

  /**
   * Initialize the Gemini client with API key
   */
  private initialize(): void {
    if (this.client) return

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new AIError(
        'GEMINI_API_KEY environment variable is not set',
        'UNAUTHORIZED'
      )
    }

    this.client = new GoogleGenerativeAI(apiKey)
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
    })
  }

  /**
   * Generate content with system and user prompts
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    text: string
    tokensUsed?: number
    durationMs: number
  }> {
    this.initialize()

    if (!this.model) {
      throw new AIError('Model not initialized', 'API_ERROR')
    }

    const startTime = Date.now()

    try {
      // Build the content parts
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: userPrompt },
          ],
        },
      ]

      // Apply any runtime config overrides
      const generationConfig: Record<string, unknown> = {}
      if (options?.temperature !== undefined) {
        generationConfig.temperature = options.temperature
      }
      if (options?.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens
      }

      const result = await this.model.generateContent({
        contents,
        generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
      })

      const response = result.response
      const text = response.text()
      const durationMs = Date.now() - startTime

      // Try to get token count if available
      let tokensUsed: number | undefined
      try {
        const tokenCount = await this.model.countTokens(systemPrompt + '\n' + userPrompt)
        tokensUsed = tokenCount.totalTokens
      } catch {
        // Token counting might not be available
      }

      return {
        text,
        tokensUsed,
        durationMs,
      }
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new AIError(
            'Rate limit exceeded. Please try again later.',
            'RATE_LIMIT',
            { durationMs }
          )
        }
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new AIError(
            'Input context is too long. Please reduce the amount of data.',
            'CONTEXT_TOO_LONG',
            { durationMs }
          )
        }
        if (error.message.includes('401') || error.message.includes('403')) {
          throw new AIError(
            'Authentication failed. Please check your API key.',
            'UNAUTHORIZED',
            { durationMs }
          )
        }
      }

      throw new AIError(
        error instanceof Error ? error.message : 'Unknown AI error',
        'API_ERROR',
        { originalError: error, durationMs }
      )
    }
  }

  /**
   * Generate and parse JSON response
   */
  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    validator: (data: unknown) => T,
    options?: {
      temperature?: number
      maxTokens?: number
      retries?: number
    }
  ): Promise<{
    data: T
    tokensUsed?: number
    durationMs: number
  }> {
    const maxRetries = options?.retries ?? 2
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.generate(
          systemPrompt,
          userPrompt,
          options
        )

        // Extract JSON from the response
        const jsonText = this.extractJSON(result.text)
        
        // Parse the JSON
        let parsed: unknown
        try {
          parsed = JSON.parse(jsonText)
        } catch (parseError) {
          throw new AIError(
            'Failed to parse AI response as JSON',
            'INVALID_RESPONSE',
            { rawText: result.text, parseError }
          )
        }

        // Validate with the provided validator (Zod schema)
        try {
          const validated = validator(parsed)
          return {
            data: validated,
            tokensUsed: result.tokensUsed,
            durationMs: result.durationMs,
          }
        } catch (validationError) {
          throw new AIError(
            'AI response failed validation',
            'VALIDATION_ERROR',
            { parsed, validationError }
          )
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry for certain errors
        if (error instanceof AIError) {
          if (['UNAUTHORIZED', 'RATE_LIMIT', 'CONTEXT_TOO_LONG'].includes(error.code)) {
            throw error
          }
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError || new AIError('Failed after all retries', 'UNKNOWN')
  }

  /**
   * Extract JSON from a potentially markdown-wrapped response
   */
  private extractJSON(text: string): string {
    // Try to find JSON in code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim()
    }

    // Try to find raw JSON (object or array)
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (jsonMatch) {
      return jsonMatch[1].trim()
    }

    // Return as-is and let parsing fail if needed
    return text.trim()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config }
    // Reset model to apply new config
    this.model = null
    this.client = null
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient()

// Export class for custom instances
export { GeminiClient }
