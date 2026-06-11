import OpenAI from 'openai';
import type { IAProvider } from './interface.js';

const FREE_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

export class OpenRouterProvider implements IAProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || FREE_MODEL;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não encontrada.');
    }
    if (model !== FREE_MODEL) {
      throw new Error(`OPENROUTER_MODEL deve ser exatamente ${FREE_MODEL}.`);
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://local.curriculum-optimizer',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'curriculum-optimizer',
      },
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
    const request = {
      model: FREE_MODEL,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.4,
      ...(options?.jsonResponse
        ? {
            response_format: { type: 'json_object' as const },
            reasoning: { effort: 'none', exclude: true },
            provider: { require_parameters: true },
          }
        : {}),
      messages: [
        {
          role: 'system',
          content: options?.jsonResponse
            ? 'Você é especialista em currículos ATS. Retorne somente um objeto JSON válido, sem raciocínio, comentários ou markdown. Não invente experiências, empresas, datas ou tecnologias.'
            : 'Você é especialista em currículos ATS. Siga o formato solicitado e não invente experiências, empresas, datas ou tecnologias.',
        },
        { role: 'user', content: prompt },
      ],
    };

    // OpenRouter accepts these normalized fields in addition to the OpenAI schema.
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
