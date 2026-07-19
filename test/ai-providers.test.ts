import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIClient } from '../src/utils/ai-client.js';
import {
  createAIProvider,
  resolveAIProviderCandidates,
  resolveAIProvidersOrder,
  resolveAIProviderType,
} from '../src/utils/ai-providers/factory.js';
import type { AICallOptions, IAProvider } from '../src/utils/ai-providers/interface.js';
import { Logger } from '../src/utils/logger.js';

const originalEnvironment = { ...process.env };
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
  vi.restoreAllMocks();
});

describe('AI provider factory', () => {
  it('cria os seis providers oficiais e aceita claude como alias', () => {
    configureProviders();
    expect(createAIProvider('openrouter').provider).toBe('openrouter');
    expect(createAIProvider('openai').provider).toBe('openai');
    expect(createAIProvider('anthropic').provider).toBe('anthropic');
    expect(createAIProvider('gemini').provider).toBe('gemini');
    expect(createAIProvider('lmstudio').provider).toBe('lmstudio');
    expect(createAIProvider('ollama').provider).toBe('ollama');
    expect(createAIProvider('claude').provider).toBe('anthropic');
    expect(resolveAIProviderType('CLAUDE')).toBe('anthropic');
  });

  it('normaliza PROVIDERS_ORDER com espaços, caixa, duplicatas e alias claude', () => {
    expect(resolveAIProvidersOrder(' gemini, OpenRouter,gemini, CLAUDE ')).toEqual([
      'gemini',
      'openrouter',
      'anthropic',
    ]);
    process.env.PROVIDERS_ORDER = 'gemini,openrouter,ollama';
    expect(resolveAIProviderCandidates()).toEqual(['gemini', 'openrouter', 'ollama']);
    delete process.env.PROVIDERS_ORDER;
    expect(() => resolveAIProviderCandidates()).toThrow('PROVIDERS_ORDER');
    expect(() => resolveAIProvidersOrder('gemini,desconhecido')).toThrow('inválido');
  });

  it('falha com provider inválido ou configuração obrigatória ausente no modo explícito', () => {
    expect(() => createAIProvider()).toThrow('--provider');
    expect(() => createAIProvider('desconhecido')).toThrow('inválido');
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_MODEL = 'gpt-test';
    expect(() => createAIProvider('openai')).toThrow('OPENAI_API_KEY');
  });

  it('expõe provider, modelo e endpoint seguro', () => {
    process.env.LMSTUDIO_BASE_URL = 'http://user:password@localhost:1234/v1?token=secret';
    process.env.LMSTUDIO_MODEL = 'local-model';
    const provider = createAIProvider('lmstudio');
    expect(provider.model).toBe('local-model');
    expect(provider.endpoint).toBe('http://localhost:1234/v1');
    expect(provider.endpoint).not.toMatch(/password|token|secret/);
  });
});

describe('AIClient observability and parsing', () => {
  it('registra metadados da chamada sem prompt, resposta ou credencial', async () => {
    const promptsDir = promptDirectory('conteúdo confidencial do prompt');
    process.env.TEST_API_KEY = 'super-secret-value';
    const provider: IAProvider = {
      provider: 'ollama',
      model: 'qwen-test',
      endpoint: 'http://localhost:11434/v1',
      call: async () => 'resposta confidencial',
    };
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = new AIClient({ provider, promptsDir, logger: new Logger(true) });

    await expect(client.callText('prompt.md', {}, { step: 'import', attempt: 2 })).resolves.toBe('resposta confidencial');
    const logs = spy.mock.calls.flat().join(' ');
    expect(logs).toContain('step=\"import\"');
    expect(logs).toContain('provider=ollama');
    expect(logs).toContain('model=\"qwen-test\"');
    expect(logs).toContain('endpoint=\"http://localhost:11434/v1\"');
    expect(logs).toContain('mode=text');
    expect(logs).toContain('attempt=2');
    expect(logs).toContain('duration_ms=');
    expect(logs).toContain('status=success');
    expect(logs).not.toMatch(/conteúdo confidencial|resposta confidencial|super-secret-value/);
  });

  it('remove credenciais de erros e parseia JSON com code fence pelo parser comum', async () => {
    const promptsDir = promptDirectory('prompt');
    process.env.TEST_API_KEY = 'super-secret-value';
    const calls: AICallOptions[] = [];
    const provider: IAProvider = {
      provider: 'ollama',
      model: 'qwen-test',
      endpoint: 'http://localhost:11434/v1',
      call: async (_prompt, options) => {
        calls.push(options || {});
        return ['```json', '{"ok":true}', '```'].join('\n');
      },
    };
    const client = new AIClient({ provider, promptsDir });
    await expect(client.callJSON<{ ok: boolean }>('prompt.md', {})).resolves.toEqual({ ok: true });
    expect(calls[0].mode).toBe('json');

    const failing: IAProvider = {
      ...provider,
      call: async () => { throw new Error('falhou com super-secret-value'); },
    };
    await expect(new AIClient({ provider: failing, promptsDir }).callText('prompt.md', {}))
      .rejects.toThrow('falhou com [redacted]');
  });

  it('pula provider sem configuração em PROVIDERS_ORDER e usa o próximo disponível', async () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_MODEL;
    process.env.PROVIDERS_ORDER = 'gemini,ollama';
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
    process.env.OLLAMA_MODEL = 'ollama-test';
    const promptsDir = promptDirectory('prompt');
    const client = new AIClient({ promptsDir });

    expect(client.provider.provider).toBe('ollama');
  });

  it('--provider não faz fallback e falha quando a configuração falta', () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_MODEL;
    process.env.PROVIDERS_ORDER = 'ollama';
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
    process.env.OLLAMA_MODEL = 'ollama-test';

    expect(() => new AIClient({ providerOverride: 'gemini' })).toThrow('GOOGLE_API_KEY');
  });

  it('faz fallback no mesmo prompt quando o primeiro provider falha em runtime', async () => {
    const promptsDir = promptDirectory('prompt {value}');
    const first: IAProvider = {
      provider: 'gemini',
      model: 'gemini-test',
      endpoint: 'https://generativelanguage.googleapis.com',
      call: vi.fn(async () => { throw new Error('quota excedida'); }),
    };
    const second: IAProvider = {
      provider: 'ollama',
      model: 'ollama-test',
      endpoint: 'http://localhost:11434/v1',
      call: vi.fn(async () => 'ok'),
    };
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const client = new AIClient({ providers: [first, second], promptsDir, logger: new Logger(true) });
    await expect(client.callText('prompt.md', { value: 'x' })).resolves.toBe('ok');
    expect(first.call).toHaveBeenCalledWith('prompt x', expect.objectContaining({ mode: 'text' }));
    expect(second.call).toHaveBeenCalledWith('prompt x', expect.objectContaining({ mode: 'text' }));
    expect(client.provider.provider).toBe('ollama');
  });

  it('faz fallback quando callJSON recebe JSON inválido', async () => {
    const promptsDir = promptDirectory('prompt');
    const first: IAProvider = {
      provider: 'gemini',
      model: 'gemini-test',
      endpoint: 'https://generativelanguage.googleapis.com',
      call: vi.fn(async () => 'não é json'),
    };
    const second: IAProvider = {
      provider: 'ollama',
      model: 'ollama-test',
      endpoint: 'http://localhost:11434/v1',
      call: vi.fn(async () => '{"ok":true}'),
    };
    await expect(new AIClient({ providers: [first, second], promptsDir }).callJSON<{ ok: boolean }>('prompt.md', {}))
      .resolves.toEqual({ ok: true });
    expect(first.call).toHaveBeenCalledWith('prompt', expect.objectContaining({ mode: 'json' }));
    expect(second.call).toHaveBeenCalledWith('prompt', expect.objectContaining({ mode: 'json' }));
  });
});

function configureProviders(): void {
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'gpt-test';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.ANTHROPIC_MODEL = 'claude-test';
  process.env.GOOGLE_API_KEY = 'test-key';
  process.env.GOOGLE_MODEL = 'gemini-test';
  process.env.LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';
  process.env.LMSTUDIO_MODEL = 'lm-test';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
  process.env.OLLAMA_MODEL = 'ollama-test';
}

function promptDirectory(content: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-client-'));
  temporaryDirectories.push(directory);
  fs.writeFileSync(path.join(directory, 'prompt.md'), content);
  return directory;
}
