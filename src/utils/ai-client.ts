import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAIProvider, type IAProvider } from './ai-providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cliente para interação com APIs de IA
 * Suporta múltiplos providers: Claude (Anthropic), ChatGPT (OpenAI) e Gemini (Google)
 */
export class AIClient {
  private provider: IAProvider;

  constructor() {
    this.provider = createAIProvider();
  }

  /**
   * Carrega um prompt de um arquivo .md
   */
  async loadPrompt(promptFileName: string): Promise<string> {
    const promptsDir = path.join(__dirname, '../../prompts');
    const promptPath = path.join(promptsDir, promptFileName);

    if (!fs.existsSync(promptPath)) {
      throw new Error(`Prompt não encontrado: ${promptPath}`);
    }

    return fs.readFileSync(promptPath, 'utf-8');
  }

  /**
   * Substitui placeholders no prompt com valores reais
   */
  private replacePlaceholders(
    prompt: string,
    placeholders: Record<string, string>
  ): string {
    let result = prompt;
    
    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Envia mensagem para API de IA e retorna resposta
   */
  async call(
    promptFileName: string,
    placeholders: Record<string, string>,
    options?: {
      maxTokens?: number;
      temperature?: number;
      enableWebSearch?: boolean;
    }
  ): Promise<string> {
    try {
      // Carrega e prepara o prompt
      let prompt = await this.loadPrompt(promptFileName);
      prompt = this.replacePlaceholders(prompt, placeholders);

      // Chama a API através do provider
      return await this.provider.call(prompt, {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        enableWebSearch: options?.enableWebSearch,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao chamar API de IA: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Envia mensagem e retorna resposta parseada como JSON
   */
  async callJSON<T>(
    promptFileName: string,
    placeholders: Record<string, string>,
    options?: {
      maxTokens?: number;
      temperature?: number;
      enableWebSearch?: boolean;
    }
  ): Promise<T> {
    const response = await this.call(promptFileName, placeholders, options);

    // Tenta extrair JSON da resposta (pode ter markdown ou texto antes/depois)
    // Primeiro, tenta extrair de code blocks markdown
    let jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    
    // Se não encontrou em code block, tenta encontrar qualquer JSON
    if (!jsonMatch) {
      jsonMatch = response.match(/\{[\s\S]*\}/);
    } else {
      // Se encontrou em code block, usa apenas o conteúdo
      jsonMatch = [jsonMatch[0], jsonMatch[1]];
    }
    
    if (!jsonMatch || !jsonMatch[0]) {
      // Mostra parte da resposta para debug
      const preview = response.substring(0, 500).replace(/\n/g, '\\n');
      const responseLength = response.length;
      
      throw new Error(
        `Resposta não contém JSON válido.\n` +
        `Resposta recebida (primeiros 500 chars de ${responseLength}):\n${preview}${responseLength > 500 ? '...' : ''}`
      );
    }

    try {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonString) as T;
    } catch (error) {
      // Mostra parte da resposta que tentou fazer parse
      const jsonPreview = jsonMatch[0].substring(0, 500).replace(/\n/g, '\\n');
      const jsonLength = jsonMatch[0].length;
      
      throw new Error(
        `Erro ao fazer parse do JSON: ${error instanceof Error ? error.message : error}\n` +
        `JSON encontrado (primeiros 500 chars de ${jsonLength}):\n${jsonPreview}${jsonLength > 500 ? '...' : ''}`
      );
    }
  }
}

// Instância singleton com lazy initialization
let aiClientInstance: AIClient | null = null;

export const aiClient = new Proxy({} as AIClient, {
  get(_target, prop) {
    if (!aiClientInstance) {
      aiClientInstance = new AIClient();
    }
    const value = aiClientInstance[prop as keyof AIClient];
    if (typeof value === 'function') {
      return value.bind(aiClientInstance);
    }
    return value;
  },
});