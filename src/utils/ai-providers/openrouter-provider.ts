import OpenAI from 'openai';
import { safeEndpoint } from './endpoint.js';
import type { AICallOptions, IAProvider } from './interface.js';

const FREE_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

export class OpenRouterProvider implements IAProvider {
  private client: OpenAI;
  readonly provider = 'openrouter' as const;
  readonly model: string;
  readonly endpoint: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL?.trim();
    const baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não encontrada.');
    }
    if (!model) {
      throw new Error(`OPENROUTER_MODEL não encontrado. Configure exatamente ${FREE_MODEL}.`);
    }
    if (model !== FREE_MODEL) {
      throw new Error(`OPENROUTER_MODEL deve ser exatamente ${FREE_MODEL}.`);
    }

    this.model = model;
    this.endpoint = safeEndpoint(baseURL);
    this.client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://local.curriculum-optimizer',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'curriculum-optimizer',
      },
    });
  }

  async call(prompt: string, options?: AICallOptions): Promise<string> {
    const jsonResponse = options?.mode === 'json';
    const request = {
      model: this.model,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.4,
      ...(jsonResponse
        ? {
            response_format: { type: 'json_object' as const },
            reasoning: { effort: 'none', exclude: true },
            provider: { require_parameters: true },
          }
        : {}),
      messages: [
        {
          role: 'system',
          content: jsonResponse
            ? 'Retorne somente um objeto JSON válido, sem raciocínio, comentários ou markdown. Não invente fatos do candidato.'
            : 'Siga exatamente o formato de texto ou HTML solicitado e não invente fatos do candidato.',
        },
        { role: 'user', content: prompt },
      ],
    };

    const response = await this.client.chat.completions.create(request as any);
    const choice = response.choices[0];
    const content = choice?.message?.content;
    if (!content) {
      throw new Error('OpenRouter retornou resposta vazia.');
    }
    if (choice.finish_reason === 'length') {
      throw new Error('OpenRouter interrompeu a resposta por limite de tokens.');
    }
    return content;
  }
}
