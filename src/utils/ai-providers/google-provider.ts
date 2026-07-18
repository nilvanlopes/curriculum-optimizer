import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AICallOptions, IAProvider } from './interface.js';

export class GoogleProvider implements IAProvider {
  private genAI: GoogleGenerativeAI;
  readonly provider = 'gemini' as const;
  readonly model: string;
  readonly endpoint = 'https://generativelanguage.googleapis.com';

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const model = process.env.GOOGLE_MODEL?.trim();
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY não encontrada.');
    }
    if (!model) {
      throw new Error('GOOGLE_MODEL não encontrado.');
    }

    this.model = model;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async call(prompt: string, options?: AICallOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        ...(options?.mode === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (String(response.candidates?.[0]?.finishReason) === 'MAX_TOKENS') {
      throw new Error('Gemini interrompeu a resposta por limite de tokens.');
    }
    const text = response.text();
    if (!text) {
      throw new Error('Gemini retornou resposta vazia.');
    }
    return text;
  }
}
