import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './logger.js';
import {
  createAIProviderByType,
  type AICallOptions,
  type AIResponseMode,
  type IAProvider,
  resolveAIProviderCandidates,
} from './ai-providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AIClientCallOptions extends Omit<AICallOptions, 'mode'> {
  mode?: AIResponseMode;
  step?: string;
  attempt?: number;
}

export interface AIClientOptions {
  provider?: IAProvider;
  providers?: IAProvider[];
  providerOverride?: string;
  logger?: Logger;
  promptsDir?: string;
}

interface AIProviderCandidate {
  provider: IAProvider;
  unavailable: boolean;
  unavailableReason?: string;
}

/** Um cliente por execução, compartilhado entre todas as etapas do fluxo. */
export class AIClient {
  private readonly providerCandidates: AIProviderCandidate[];
  private readonly logger: Logger;
  private readonly promptsDir: string;
  private readonly singleProviderMode: boolean;
  private readonly skippedProviders: string[] = [];

  constructor(options: AIClientOptions = {}) {
    this.logger = options.logger || new Logger(false);
    this.promptsDir = options.promptsDir || path.join(__dirname, '../../prompts');
    this.singleProviderMode = Boolean(options.provider || options.providerOverride?.trim());
    this.providerCandidates = options.providers
      ? options.providers.map((provider) => ({ provider, unavailable: false }))
      : options.provider
      ? [{ provider: options.provider, unavailable: false }]
      : this.createProviderCandidates(options.providerOverride);
    if (this.providerCandidates.length === 0) {
      throw new Error('Nenhum provider de IA disponível. Use --provider ou defina PROVIDERS_ORDER.');
    }
  }

  get provider(): IAProvider {
    return this.providerCandidates.find((candidate) => !candidate.unavailable)?.provider
      || this.providerCandidates[0].provider;
  }

  async loadPrompt(promptFileName: string): Promise<string> {
    const promptPath = path.join(this.promptsDir, promptFileName);
    if (!fs.existsSync(promptPath)) {
      throw new Error(`Prompt não encontrado: ${promptPath}`);
    }
    return fs.readFileSync(promptPath, 'utf-8');
  }

  private replacePlaceholders(prompt: string, placeholders: Record<string, string>): string {
    return prompt.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, key: string) =>
      Object.prototype.hasOwnProperty.call(placeholders, key) ? placeholders[key] : match
    );
  }

  async call(
    promptFileName: string,
    placeholders: Record<string, string>,
    options: AIClientCallOptions = {}
  ): Promise<string> {
    const mode = options.mode || 'text';
    const step = options.step || promptFileName;
    const template = await this.loadPrompt(promptFileName);
    const prompt = this.replacePlaceholders(template, placeholders);

    return this.callWithFallback(step, mode, options, async (provider) =>
      provider.call(prompt, {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        enableWebSearch: options.enableWebSearch,
        mode,
      })
    );
  }

  async callText(
    promptFileName: string,
    placeholders: Record<string, string>,
    options: Omit<AIClientCallOptions, 'mode'> = {}
  ): Promise<string> {
    return this.call(promptFileName, placeholders, { ...options, mode: 'text' });
  }

  async callJSON<T>(
    promptFileName: string,
    placeholders: Record<string, string>,
    options: Omit<AIClientCallOptions, 'mode'> = {}
  ): Promise<T> {
    const mode = 'json';
    const step = options.step || promptFileName;
    const template = await this.loadPrompt(promptFileName);
    const prompt = this.replacePlaceholders(template, placeholders);

    return this.callWithFallback(step, mode, { ...options, mode }, async (provider) => {
      const response = await provider.call(prompt, {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        enableWebSearch: options.enableWebSearch,
        mode,
      });
      return parseJSONResponse<T>(response);
    });
  }

  private createProviderCandidates(providerOverride?: string): AIProviderCandidate[] {
    const providerTypes = resolveAIProviderCandidates(providerOverride);
    const candidates: AIProviderCandidate[] = [];
    const skipped: string[] = [];

    for (const providerType of providerTypes) {
      try {
        candidates.push({ provider: createAIProviderByType(providerType), unavailable: false });
      } catch (error) {
        const message = redactSecrets(error instanceof Error ? error.message : String(error));
        if (this.singleProviderMode) {
          throw error;
        }
        skipped.push(`${providerType}: ${message}`);
        this.skippedProviders.push(`${providerType}: ${message}`);
        this.logger.info(`[ai-provider-skip] provider=${providerType} status=unavailable error=${JSON.stringify(message)}`);
      }
    }

    if (candidates.length === 0) {
      const details = skipped.length > 0 ? ` Tentativas: ${skipped.join('; ')}.` : '';
      throw new Error(`Nenhum provider de IA disponível. Use --provider ou defina PROVIDERS_ORDER.${details}`);
    }
    return candidates;
  }

  private async callWithFallback<T>(
    step: string,
    mode: AIResponseMode,
    options: AIClientCallOptions,
    execute: (provider: IAProvider) => Promise<T>
  ): Promise<T> {
    const failures: string[] = [...this.skippedProviders];
    let providerAttempt = 0;

    for (const candidate of this.providerCandidates) {
      if (candidate.unavailable) {
        failures.push(`${candidate.provider.provider}: indisponível por falha anterior${candidate.unavailableReason ? ` (${candidate.unavailableReason})` : ''}`);
        continue;
      }

      providerAttempt += 1;
      const attempt = options.attempt || providerAttempt;
      const startedAt = Date.now();
      try {
        const result = await execute(candidate.provider);
        this.logCall(candidate.provider, step, mode, attempt, Date.now() - startedAt, 'success');
        return result;
      } catch (error) {
        const message = redactSecrets(error instanceof Error ? error.message : String(error));
        this.logCall(candidate.provider, step, mode, attempt, Date.now() - startedAt, 'error', message);
        failures.push(`${candidate.provider.provider}: ${message}`);
        candidate.unavailable = true;
        candidate.unavailableReason = message;

        if (this.singleProviderMode) {
          throw new Error(`Erro na etapa de IA ${step}: ${message}`);
        }
      }
    }

    throw new Error(`Erro na etapa de IA ${step}: todos os providers falharam (${failures.join('; ')}).`);
  }

  private logCall(
    provider: IAProvider,
    step: string,
    mode: AIResponseMode,
    attempt: number,
    durationMs: number,
    status: 'success' | 'error',
    errorMessage?: string
  ): void {
    const fields = [
      `step=${JSON.stringify(step)}`,
      `provider=${provider.provider}`,
      `model=${JSON.stringify(provider.model)}`,
      `endpoint=${JSON.stringify(provider.endpoint)}`,
      `mode=${mode}`,
      `attempt=${attempt}`,
      `duration_ms=${durationMs}`,
      `status=${status}`,
    ];
    if (errorMessage) {
      fields.push(`error=${JSON.stringify(errorMessage)}`);
    }
    this.logger.info(`[ai-call] ${fields.join(' ')}`);
  }
}

export function parseJSONResponse<T>(response: string): T {
  const trimmed = response.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = (fenced?.[1] || trimmed).trim();

  const direct = tryParseJSON<T>(candidate);
  if (direct.ok) {
    return direct.value;
  }

  const objectStart = candidate.indexOf('{');
  const arrayStart = candidate.indexOf('[');
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  if (start < 0) {
    throw new Error(`Resposta não contém JSON válido (${response.length} caracteres).`);
  }

  const closing = candidate[start] === '{' ? '}' : ']';
  const end = candidate.lastIndexOf(closing);
  if (end <= start) {
    throw new Error(`Resposta JSON incompleta (${response.length} caracteres).`);
  }

  const extracted = tryParseJSON<T>(candidate.slice(start, end + 1));
  if (!extracted.ok) {
    throw new Error(`Resposta contém JSON inválido (${response.length} caracteres): ${extracted.error}`);
  }
  return extracted.value;
}

function tryParseJSON<T>(value: string):
  | { ok: true; value: T }
  | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(value) as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function redactSecrets(message: string): string {
  let redacted = message;
  for (const [name, value] of Object.entries(process.env)) {
    if (!value || value.length < 6 || !/(?:KEY|TOKEN|SECRET|PASSWORD)/i.test(name)) {
      continue;
    }
    redacted = redacted.split(value).join('[redacted]');
  }
  return redacted.replace(/(?:sk|key)-[A-Za-z0-9._-]{8,}/g, '[redacted]');
}
