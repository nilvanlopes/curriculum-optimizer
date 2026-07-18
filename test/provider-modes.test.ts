import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicProvider } from '../src/utils/ai-providers/anthropic-provider.js';
import { GoogleProvider } from '../src/utils/ai-providers/google-provider.js';
import { LMStudioProvider } from '../src/utils/ai-providers/lmstudio-provider.js';
import { OllamaProvider } from '../src/utils/ai-providers/ollama-provider.js';
import { OpenAIProvider } from '../src/utils/ai-providers/openai-provider.js';

const openAICreate = vi.fn();
const anthropicCreate = vi.fn();
const getGenerativeModel = vi.fn();

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: openAICreate } };
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: anthropicCreate };
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class GoogleGenerativeAI {
    getGenerativeModel = getGenerativeModel;
  },
}));

const originalEnvironment = { ...process.env };

beforeEach(() => {
  openAICreate.mockReset().mockResolvedValue({
    choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
  });
  anthropicCreate.mockReset().mockResolvedValue({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '{"ok":true}' }],
  });
  getGenerativeModel.mockReset().mockReturnValue({
    generateContent: async () => ({
      response: {
        candidates: [{ finishReason: 'STOP' }],
        text: () => '{"ok":true}',
      },
    }),
  });
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
});

describe('provider response modes', () => {
  it.each([
    ['openai', () => {
      process.env.OPENAI_API_KEY = 'key';
      process.env.OPENAI_MODEL = 'gpt-test';
      return new OpenAIProvider();
    }],
    ['lmstudio', () => {
      process.env.LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';
      process.env.LMSTUDIO_MODEL = 'local-test';
      return new LMStudioProvider();
    }],
    ['ollama', () => {
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
      process.env.OLLAMA_MODEL = 'ollama-test';
      return new OllamaProvider();
    }],
  ] as const)('%s usa response_format somente em JSON', async (_name, factory) => {
    const provider = factory();
    await provider.call('json prompt', { mode: 'json' });
    expect(openAICreate).toHaveBeenLastCalledWith(expect.objectContaining({
      response_format: { type: 'json_object' },
    }));
    openAICreate.mockClear();
    await provider.call('html prompt', { mode: 'text' });
    const request = openAICreate.mock.calls[0][0];
    expect(request).not.toHaveProperty('response_format');
    expect(request.messages[0].content).not.toMatch(/somente um objeto JSON/i);
  });

  it('Gemini usa MIME JSON somente no modo estruturado', async () => {
    process.env.GOOGLE_API_KEY = 'key';
    process.env.GOOGLE_MODEL = 'gemini-test';
    const provider = new GoogleProvider();
    await provider.call('prompt', { mode: 'json' });
    expect(getGenerativeModel).toHaveBeenLastCalledWith(expect.objectContaining({
      generationConfig: expect.objectContaining({ responseMimeType: 'application/json' }),
    }));
    await provider.call('prompt', { mode: 'text' });
    expect(getGenerativeModel.mock.calls[1][0].generationConfig).not.toHaveProperty('responseMimeType');
  });

  it('Anthropic adiciona instrução estrutural estrita somente em JSON', async () => {
    process.env.ANTHROPIC_API_KEY = 'key';
    process.env.ANTHROPIC_MODEL = 'claude-test';
    const provider = new AnthropicProvider();
    await provider.call('prompt', { mode: 'json' });
    expect(anthropicCreate).toHaveBeenLastCalledWith(expect.objectContaining({
      system: expect.stringMatching(/somente um objeto JSON/i),
    }));
    await provider.call('prompt', { mode: 'text' });
    expect(anthropicCreate.mock.calls[1][0]).not.toHaveProperty('system');
  });

  it('reporta truncamento em adapter OpenAI-compatible, Anthropic e Gemini', async () => {
    process.env.OPENAI_API_KEY = 'key';
    process.env.OPENAI_MODEL = 'gpt-test';
    openAICreate.mockResolvedValueOnce({
      choices: [{ finish_reason: 'length', message: { content: '{' } }],
    });
    await expect(new OpenAIProvider().call('prompt', { mode: 'json' })).rejects.toThrow('limite de tokens');

    process.env.ANTHROPIC_API_KEY = 'key';
    process.env.ANTHROPIC_MODEL = 'claude-test';
    anthropicCreate.mockResolvedValueOnce({ stop_reason: 'max_tokens', content: [] });
    await expect(new AnthropicProvider().call('prompt')).rejects.toThrow('limite de tokens');

    process.env.GOOGLE_API_KEY = 'key';
    process.env.GOOGLE_MODEL = 'gemini-test';
    getGenerativeModel.mockReturnValueOnce({
      generateContent: async () => ({
        response: { candidates: [{ finishReason: 'MAX_TOKENS' }], text: () => '{' },
      }),
    });
    await expect(new GoogleProvider().call('prompt')).rejects.toThrow('limite de tokens');
  });
});
