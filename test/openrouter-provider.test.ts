import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenRouterProvider } from '../src/utils/ai-providers/openrouter-provider.js';

const createCompletion = vi.fn();

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

const originalApiKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_MODEL;

beforeEach(() => {
  createCompletion.mockReset();
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.OPENROUTER_MODEL;
  else process.env.OPENROUTER_MODEL = originalModel;
});

describe('OpenRouterProvider', () => {
  it('aceita somente o auto-router gratuito', () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

    expect(() => new OpenRouterProvider()).not.toThrow();
  });

  it('bloqueia qualquer outro modelo', () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-4o';

    expect(() => new OpenRouterProvider()).toThrow('deve ser exatamente nvidia/nemotron-3-super-120b-a12b:free');
  });

  it('força JSON e desativa reasoning em chamadas estruturadas', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
    createCompletion.mockResolvedValue({
      choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
    });

    const provider = new OpenRouterProvider();
    await expect(provider.call('prompt', { jsonResponse: true })).resolves.toBe('{"ok":true}');

    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      response_format: { type: 'json_object' },
      reasoning: { effort: 'none', exclude: true },
      provider: { require_parameters: true },
    }));
  });

  it('reporta resposta truncada por limite de tokens', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
    createCompletion.mockResolvedValue({
      choices: [{ finish_reason: 'length', message: { content: '{"incompleto":' } }],
    });

    const provider = new OpenRouterProvider();
    await expect(provider.call('prompt', { jsonResponse: true }))
      .rejects.toThrow('interrompeu a resposta por limite de tokens');
  });
});
