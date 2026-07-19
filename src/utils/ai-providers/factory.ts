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
    throw new Error('Provider de IA não configurado. Use --provider ou defina PROVIDERS_ORDER.');
  }

  const normalized = (configured === 'claude' ? 'anthropic' : configured) as AIProviderInput;
  if (!SUPPORTED_AI_PROVIDERS.includes(normalized as AIProviderType)) {
    throw new Error(
      `Provider de IA inválido: "${configured}". Use um dos seguintes: ${SUPPORTED_AI_PROVIDERS.join(', ')}`
    );
  }
  return normalized as AIProviderType;
}

export function resolveAIProvidersOrder(value?: string): AIProviderType[] {
  const configured = value?.trim();
  if (!configured) {
    throw new Error('PROVIDERS_ORDER não configurado. Use --provider ou defina PROVIDERS_ORDER.');
  }

  const providers: AIProviderType[] = [];
  for (const entry of configured.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const provider = resolveAIProviderType(trimmed);
    if (!providers.includes(provider)) {
      providers.push(provider);
    }
  }

  if (providers.length === 0) {
    throw new Error('PROVIDERS_ORDER não contém providers válidos. Use --provider ou defina PROVIDERS_ORDER.');
  }
  return providers;
}

export function resolveAIProviderCandidates(providerOverride?: string): AIProviderType[] {
  if (providerOverride?.trim()) {
    return [resolveAIProviderType(providerOverride)];
  }
  return resolveAIProvidersOrder(process.env.PROVIDERS_ORDER);
}

/** Cria um provider sem alterar o ambiente do processo. */
export function createAIProvider(providerOverride?: string): IAProvider {
  const providerType = resolveAIProviderType(providerOverride);
  return createAIProviderByType(providerType);
}

export function createAIProviderByType(providerType: AIProviderType): IAProvider {
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
