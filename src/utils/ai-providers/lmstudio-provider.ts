import OpenAI from 'openai';
import type { IAProvider } from './interface.js';

export class LMStudioProvider implements IAProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.model = process.env.LMSTUDIO_MODEL || '';
    if (!this.model) {
      throw new Error('LMSTUDIO_MODEL não encontrado. Use o identificador exibido por GET /v1/models.');
    }

    this.client = new OpenAI({
      apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
      baseURL: process.env.LMSTUDIO_BASE_URL || 'http://host.docker.internal:1234/v1',
    });
  }

  async call(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      enableWebSearch?: boolean;
      jsonResponse?: boolean;
    }
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.4,
      ...(options?.jsonResponse ? { response_format: { type: 'json_object' as const } } : {}),
      messages: [
        {
          role: 'system',
          content: options?.jsonResponse
            ? 'Retorne somente um objeto JSON válido, sem raciocínio, comentários ou markdown. Não invente dados.'
            : 'Você é especialista em currículos ATS. Siga exatamente o formato solicitado e não invente dados.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const choice = response.choices[0];
    const content = choice?.message?.content;
    if (!content) {
      throw new Error('LM Studio retornou resposta vazia.');
    }
    if (choice.finish_reason === 'length') {
      throw new Error('LM Studio interrompeu a resposta por limite de tokens.');
    }
    return content;
  }
}
