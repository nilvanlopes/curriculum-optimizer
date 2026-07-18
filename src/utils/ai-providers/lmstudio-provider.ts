import OpenAI from 'openai';
import { safeEndpoint } from './endpoint.js';
import type { AICallOptions, IAProvider } from './interface.js';

export class LMStudioProvider implements IAProvider {
  private client: OpenAI;
  readonly provider = 'lmstudio' as const;
  readonly model: string;
  readonly endpoint: string;

  constructor() {
    const model = process.env.LMSTUDIO_MODEL?.trim();
    const baseURL = process.env.LMSTUDIO_BASE_URL?.trim();
    if (!model) {
      throw new Error('LMSTUDIO_MODEL não encontrado. Use o identificador exibido por GET /v1/models.');
    }
    if (!baseURL) {
      throw new Error('LMSTUDIO_BASE_URL não encontrado.');
    }

    this.model = model;
    this.endpoint = safeEndpoint(baseURL);
    this.client = new OpenAI({
      apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
      baseURL,
    });
  }

  async call(prompt: string, options?: AICallOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.4,
      ...(options?.mode === 'json'
        ? { response_format: { type: 'json_object' as const } }
        : {}),
      messages: [
        {
          role: 'system',
          content: options?.mode === 'json'
            ? 'Retorne somente um objeto JSON válido, sem raciocínio, comentários ou markdown. Não invente dados.'
            : 'Siga exatamente o formato solicitado e não invente dados do candidato.',
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
