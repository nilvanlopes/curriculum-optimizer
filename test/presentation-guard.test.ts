import path from 'path';
import { describe, expect, it } from 'vitest';
import { ProfileExtractor } from '../src/utils/profile-extractor.js';
import {
  buildFallbackPresentation,
  validatePresentationText,
} from '../src/prompts/selectors/presentation-guard.js';
import type { JobAnalysisResult } from '../src/types.js';

describe('presentation guard', () => {
  const templatePath = path.join(process.cwd(), 'test/fixtures/base-curriculum.html');
  const source = ProfileExtractor.extractFromTemplate(templatePath);

  it('aceita um resumo factual do template base', () => {
    const summary =
      'Desenvolvedora Web com experiência em aplicações responsivas, APIs, React e TypeScript.';

    const result = validatePresentationText(summary, source, source.title);

    expect(result.valid).toBe(true);
    expect(result.rejectedTerms).toHaveLength(0);
  });

  it('rejeita credencial inventada e gera fallback seguro', () => {
    const summary =
      'Desenvolvedora Web com MBA em gestão de projetos, experiência em React, APIs e liderança técnica.';

    const result = validatePresentationText(summary, source, source.title);
    const fallback = buildFallbackPresentation(source, source.title);

    expect(result.valid).toBe(false);
    expect(result.rejectedTerms).toContain('MBA');
    expect(fallback).not.toContain('MBA');
    expect(fallback.length).toBeGreaterThan(50);
    expect(fallback.length).toBeLessThanOrEqual(380);
  });

  it('tolera análise de vaga parcial sem quebrar em arrays ausentes', () => {
    const partialAnalysis = {
      matchScore: 80,
      matchScoreJustification: 'Vaga menciona React e APIs.',
    } as unknown as JobAnalysisResult;

    const summary =
      'Desenvolvedora Web com experiência em aplicações responsivas, APIs e React.';

    const result = validatePresentationText(summary, source, source.title, partialAnalysis);
    const fallback = buildFallbackPresentation(source, source.title, partialAnalysis);

    expect(result.valid).toBe(true);
    expect(fallback.length).toBeGreaterThan(50);
    expect(fallback).toContain(source.title);
  });
});
