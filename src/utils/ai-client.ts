import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './logger.js';
import {
  createAIProvider,
  type AICallOptions,
  type AIResponseMode,
  type IAProvider,
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
  providerOverride?: string;
  logger?: Logger;
  promptsDir?: string;
}

/** Um cliente por execução, compartilhado entre todas as etapas do fluxo. */
export class AIClient {
  private readonly providerAdapter: IAProvider;
  private readonly logger: Logger;
  private readonly promptsDir: string;

  constructor(options: AIClientOptions = {}) {
    this.providerAdapter = options.provider || createAIProvider(options.providerOverride);
    this.logger = options.logger || new Logger(false);
    this.promptsDir = options.promptsDir || path.join(__dirname, '../../prompts');
  }

  get provider(): IAProvider {
    return this.providerAdapter;
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
    const attempt = options.attempt || 1;
    const step = options.step || promptFileName;
    const startedAt = Date.now();

    try {
      const template = await this.loadPrompt(promptFileName);
      const prompt = this.replacePlaceholders(template, placeholders);
      const response = await this.providerAdapter.call(prompt, {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        enableWebSearch: options.enableWebSearch,
        mode,
      });
      this.logCall(step, mode, attempt, Date.now() - startedAt, 'success');
      return response;
    } catch (error) {
      const message = redactSecrets(error instanceof Error ? error.message : String(error));
      this.logCall(step, mode, attempt, Date.now() - startedAt, 'error', message);
      throw new Error(`Erro na etapa de IA ${step}: ${message}`);
    }
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
    const response = await this.call(promptFileName, placeholders, { ...options, mode: 'json' });
    return parseJSONResponse<T>(response);
  }

  private logCall(
    step: string,
    mode: AIResponseMode,
    attempt: number,
    durationMs: number,
    status: 'success' | 'error',
    errorMessage?: string
  ): void {
    const fields = [
      `step=${JSON.stringify(step)}`,
      `provider=${this.providerAdapter.provider}`,
      `model=${JSON.stringify(this.providerAdapter.model)}`,
      `endpoint=${JSON.stringify(this.providerAdapter.endpoint)}`,
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
