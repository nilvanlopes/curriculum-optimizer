import { AnthropicProvider } from './anthropic-provider.js';
import { GoogleProvider } from './google-provider.js';
import { LMStudioProvider } from './lmstudio-provider.js';
import type { AIProviderInput, AIProviderType, IAProvider } from './interface.js';
import { OllamaProvider } from './ollama-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { OpenRouterProvider } from './openrouter-provider.js';

export const SUPPORTED_AI_PROVIDERS: readonly AIProviderType[] = [
  'openrouter',
  'openai',
  'anthropic',
  'gemini',
  'lmstudio',
  'ollama',
] as const;

export function resolveAIProviderType(value?: string): AIProviderType {
  const configured = value?.trim().toLowerCase();
  if (!configured) {
    throw new Error('Provider de IA não configurado. Use --provider ou defina AI_PROVIDER.');
  }

  const normalized = (configured === 'claude' ? 'anthropic' : configured) as AIProviderInput;
  if (!SUPPORTED_AI_PROVIDERS.includes(normalized as AIProviderType)) {
    throw new Error(
      `Provider de IA inválido: "${configured}". Use um dos seguintes: ${SUPPORTED_AI_PROVIDERS.join(', ')}`
    );
  }
  return normalized as AIProviderType;
}

/** Cria um provider sem alterar AI_PROVIDER no ambiente do processo. */
export function createAIProvider(providerOverride?: string): IAProvider {
  const providerType = resolveAIProviderType(providerOverride ?? process.env.AI_PROVIDER);

  switch (providerType) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'openrouter':
      return new OpenRouterProvider();
    case 'lmstudio':
      return new LMStudioProvider();
    case 'ollama':
      return new OllamaProvider();
    case 'gemini':
      return new GoogleProvider();
  }
}
