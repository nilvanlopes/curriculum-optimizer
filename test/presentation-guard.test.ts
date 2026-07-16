import path from 'path';
import { describe, expect, it } from 'vitest';
import { ProfileExtractor } from '../src/utils/profile-extractor.js';
import {
  buildFallbackPresentation,
  validatePresentationText,
} from '../src/prompts/selectors/presentation-guard.js';

describe('presentation guard', () => {
  const templatePath = path.join(process.cwd(), 'src/templates/base-curriculum.html');
  const source = ProfileExtractor.extractFromTemplate(templatePath);

  it('aceita um resumo factual do template base', () => {
    const summary =
      'Desenvolvedor Web Full Stack com experiência profissional e projetos pessoais, focado em aplicações web, interfaces responsivas, APIs e aprendizado contínuo.';

    const result = validatePresentationText(summary, source, source.title);

    expect(result.valid).toBe(true);
    expect(result.rejectedTerms).toHaveLength(0);
  });

  it('rejeita credencial inventada e gera fallback seguro', () => {
    const summary =
      'Desenvolvedor Web Full Stack com MBA em gestão de projetos, experiência em React, APIs e liderança técnica.';

    const result = validatePresentationText(summary, source, source.title);
    const fallback = buildFallbackPresentation(source, source.title);

    expect(result.valid).toBe(false);
    expect(result.rejectedTerms).toContain('MBA');
    expect(fallback).not.toContain('MBA');
    expect(fallback.length).toBeGreaterThan(50);
    expect(fallback.length).toBeLessThanOrEqual(380);
  });
});
