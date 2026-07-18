export type AIProviderType =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'lmstudio'
  | 'ollama';

export type AIProviderInput = AIProviderType | 'claude';
export type AIResponseMode = 'text' | 'json';

export interface AICallOptions {
  maxTokens?: number;
  temperature?: number;
  enableWebSearch?: boolean;
  mode?: AIResponseMode;
}

/** Contrato uniforme exposto por todos os adapters de IA. */
export interface IAProvider {
  readonly provider: AIProviderType;
  readonly model: string;
  /** Endpoint sanitizado, próprio para logs (nunca contém credenciais ou query string). */
  readonly endpoint: string;

  call(prompt: string, options?: AICallOptions): Promise<string>;
}
