/**
 * Interface para providers de IA
 * Abstrai as diferenças entre diferentes APIs de IA
 */
export interface IAProvider {
  /**
   * Envia um prompt para a IA e retorna a resposta como texto
   */
  call(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      enableWebSearch?: boolean;
    }
  ): Promise<string>;
}

/**
 * Tipo de provider suportado
 */
export type AIProviderType = 'claude' | 'openai' | 'gemini';
