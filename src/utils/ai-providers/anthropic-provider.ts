import Anthropic from '@anthropic-ai/sdk';
import { safeEndpoint } from './endpoint.js';
import type { AICallOptions, IAProvider } from './interface.js';

export class AnthropicProvider implements IAProvider {
  private client: Anthropic;
  readonly provider = 'anthropic' as const;
  readonly model: string;
  readonly endpoint: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL?.trim();
    const baseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY não encontrada.');
    }
    if (!model) {
      throw new Error('ANTHROPIC_MODEL não encontrado.');
    }

    this.model = model;
    this.endpoint = safeEndpoint(baseURL);
    this.client = new Anthropic({ apiKey, baseURL });
  }

  async call(prompt: string, options?: AICallOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
      ...(options?.mode === 'json'
        ? {
            system: 'Retorne somente um objeto JSON válido que siga exatamente o schema pedido. Não use markdown, não explique e não invente fatos.',
          }
        : {}),
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'max_tokens') {
      throw new Error('Anthropic interrompeu a resposta por limite de tokens.');
    }
    const text = response.content
      .filter((item): item is Anthropic.TextBlock => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();
    if (!text) {
      throw new Error('Anthropic retornou resposta vazia.');
    }
    return text;
  }
}
