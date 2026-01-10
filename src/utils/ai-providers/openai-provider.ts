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
      enableWebSearch?: boolean;
    }
  ): Promise<string> {
    try {
      // OpenAI não tem busca web nativa via API
      // Quando enableWebSearch estiver habilitado, o prompt já instrui a IA
      // Para busca web real, seria necessário usar function calling com APIs externas
      // Por enquanto, confiamos na instrução do prompt

      // Log do tamanho do prompt para debug (apenas em modo verbose)
      const promptSize = new TextEncoder().encode(prompt).length;
      if (process.env.DEBUG) {
        console.log(`[OpenAI] Tamanho do prompt: ${(promptSize / 1024).toFixed(2)} KB`);
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a professional resume optimization assistant. Your task is to analyze resumes and job descriptions, then provide structured JSON responses following the given instructions exactly. Always respond with valid JSON in your responses.',
          },
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

      // Verifica se a resposta foi bloqueada/rejeitada
      if (content.toLowerCase().includes("i'm sorry") || 
          content.toLowerCase().includes("i can't assist") ||
          content.toLowerCase().includes("cannot assist")) {
        throw new Error(
          `A API da OpenAI recusou a requisição. Resposta: "${content}". ` +
          `Isso pode ocorrer devido a políticas de conteúdo. Verifique se o prompt está adequado.`
        );
      }

      return content;
    } catch (error: any) {
      // Trata erros específicos da API OpenAI
      if (error?.response?.data?.error) {
        const apiError = error.response.data.error;
        throw new Error(
          `Erro da API OpenAI: ${apiError.message || apiError.type || 'Erro desconhecido'}. ` +
          `Tipo: ${apiError.type || 'N/A'}, Código: ${apiError.code || 'N/A'}`
        );
      }
      
      if (error instanceof Error) {
        throw new Error(`Erro ao chamar API de IA: ${error.message}`);
      }
      throw error;
    }
  }
}
