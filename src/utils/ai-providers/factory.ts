import { AnthropicProvider } from './anthropic-provider.js';
import { GoogleProvider } from './google-provider.js';
import type { AIProviderType, IAProvider } from './interface.js';
import { OpenAIProvider } from './openai-provider.js';

/**
 * Factory para criar o provider de IA apropriado baseado na configuração
 */
export function createAIProvider(): IAProvider {
  const providerType = (process.env.AI_PROVIDER || 'claude').toLowerCase() as AIProviderType;

  // Validação do tipo de provider
  const validProviders: AIProviderType[] = ['claude', 'openai', 'gemini'];
  if (!validProviders.includes(providerType)) {
    throw new Error(
      `AI_PROVIDER inválido: "${providerType}". Use um dos seguintes: ${validProviders.join(', ')}`
    );
  }

  // Cria o provider apropriado
  switch (providerType) {
    case 'claude':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'gemini':
      return new GoogleProvider();
    default:
      throw new Error(`Provider não implementado: ${providerType}`);
  }
}
