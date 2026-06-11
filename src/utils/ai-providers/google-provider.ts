import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAProvider } from './interface.js';

/**
 * Provider para Gemini API (Google)
 */
export class GoogleProvider implements IAProvider {
  private genAI: GoogleGenerativeAI;
  private model: string = 'gemini-2.5-pro';

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'GOOGLE_API_KEY não encontrada. Configure no arquivo .env ou variável de ambiente.'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async call(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      enableWebSearch?: boolean;
    }
  ): Promise<string> {
    try {
      // Gemini 1.5 Pro pode ter acesso a busca web em alguns casos
      // Quando enableWebSearch estiver habilitado, o prompt já instrui a IA
      // Por enquanto, confiamos na instrução do prompt

      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: options?.maxTokens || 4096,
          temperature: options?.temperature || 0.7,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Resposta da API não contém texto');
      }

      return text;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao chamar API de IA: ${error.message}`);
      }
      throw error;
    }
  }
}
