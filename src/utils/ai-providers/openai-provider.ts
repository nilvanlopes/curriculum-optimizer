import OpenAI from 'openai';
import type { IAProvider } from './interface.js';

/**
 * Provider para ChatGPT API (OpenAI)
 */
export class OpenAIProvider implements IAProvider {
  private client: OpenAI;
  private model: string = 'gpt-4o';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY não encontrada. Configure no arquivo .env ou variável de ambiente.'
      );
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async call(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Resposta da API não contém texto');
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao chamar API de IA: ${error.message}`);
      }
      throw error;
    }
  }
}
