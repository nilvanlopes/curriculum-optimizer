import Anthropic from '@anthropic-ai/sdk';
import type { IAProvider } from './interface.js';

/**
 * Provider para Claude API (Anthropic)
 */
export class AnthropicProvider implements IAProvider {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY não encontrada. Configure no arquivo .env ou variável de ambiente.'
      );
    }

    this.client = new Anthropic({
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
      const response = await this.client.messages.create({
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

      // Extrai o texto da resposta
      const content = response.content[0];

      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Resposta da API não contém texto');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao chamar API de IA: ${error.message}`);
      }
      throw error;
    }
  }
}
