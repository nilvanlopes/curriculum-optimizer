import * as cheerio from 'cheerio';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { HTMLComposer } from '../src/generators/html-composer.js';

describe('HTMLComposer', () => {
  it('renderiza o template base com summary e experiências obrigatórias', async () => {
    const templatePath = path.join(process.cwd(), 'test/fixtures/base-curriculum.html');
    const composer = new HTMLComposer(templatePath);

    const html = await composer.compose('Desenvolvedor Frontend', {
      selectedExperiences: [
        {
          companyId: 'empresa-exemplo',
          priority: 1,
          achievementsToHighlight: [0, 1],
        },
      ],
      selectedSkills: {
        categories: [
          {
            categoryId: 'frontend',
            categoryName: 'Frontend',
            skills: ['HTML', 'CSS', 'React'],
          },
        ],
      },
      selectedCertifications: [
        {
          index: 0,
        },
      ],
      presentationText:
        'Profissional com foco em frontend, interfaces responsivas, colaboração com times multidisciplinares e entrega consistente de produtos web.',
    });

    const $ = cheerio.load(html);

    expect(html.match(/<!DOCTYPE html>/gi)).toHaveLength(1);
    expect($('html').length).toBe(1);
    expect($('head title').text()).toContain('Desenvolvedor Frontend');
    expect($('.header .title').text()).toBe('Desenvolvedor Frontend');
    expect($('.summary').length).toBe(1);
    expect($('.summary').text()).toContain('frontend');
    expect($('.experience-item').length).toBe(1);
    expect($('.experience-item[data-company="empresa-exemplo"]').length).toBe(1);
    expect($('.experience-item .achievement').length).toBeGreaterThanOrEqual(2);
    expect($('.skill-category').length).toBe(1);
    expect($('.skill-category[data-category="frontend"] .skill-list').text()).toContain('React');
    expect($('.certifications-list .achievement').length).toBe(1);
  });
});
