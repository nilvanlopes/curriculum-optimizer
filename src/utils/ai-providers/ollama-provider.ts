import OpenAI from 'openai';
import { safeEndpoint } from './endpoint.js';
import type { AICallOptions, IAProvider } from './interface.js';

/** Adapter para a API OpenAI-compatible exposta pelo Ollama. */
export class OllamaProvider implements IAProvider {
  private client: OpenAI;
  readonly provider = 'ollama' as const;
  readonly model: string;
  readonly endpoint: string;

  constructor() {
    const baseURL = process.env.OLLAMA_BASE_URL?.trim();
    const model = process.env.OLLAMA_MODEL?.trim();
    if (!baseURL) {
      throw new Error('OLLAMA_BASE_URL não encontrado.');
    }
    if (!model) {
      throw new Error('OLLAMA_MODEL não encontrado.');
    }

    this.model = model;
    this.endpoint = safeEndpoint(baseURL);
    this.client = new OpenAI({
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
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
      throw new Error('Ollama retornou resposta vazia.');
    }
    if (choice.finish_reason === 'length') {
      throw new Error('Ollama interrompeu a resposta por limite de tokens.');
    }
    return content;
  }
}
