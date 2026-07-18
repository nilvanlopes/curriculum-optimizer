import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/** Gera uma representação textual do mesmo currículo HTML final. */
export class TextGenerator {
  convertHTMLToText(html: string): string {
    const $ = cheerio.load(html);
    const lines: string[] = [];

    append(lines, $('.header h1').first().text());
    append(lines, $('.header .title').first().text());
    const contacts = $('.contact-info').first().text().replace(/\s+/g, ' ').trim();
    append(lines, contacts);
    append(lines, $('.summary').first().text());

    const experiences = $('.experience-item:not(.hidden)');
    if (experiences.length > 0) {
      appendHeading(lines, 'EXPERIÊNCIA PROFISSIONAL');
    }
    experiences.each((_, element) => {
      const item = $(element);
      append(lines, item.find('.job-title').first().text());
      const company = item.find('.company-name').first().text().trim();
      const period = item.find('.period').first().text().trim();
      append(lines, [company, period].filter(Boolean).join(' - '));
      item.find('.achievement:not(.hidden)').each((__, achievement) => {
        const text = $(achievement).text().replace(/\s+/g, ' ').trim();
        if (text) lines.push(`• ${text}`);
      });
      lines.push('');
    });

    if ($('.skill-category:not(.hidden)').length > 0) {
      appendHeading(lines, 'COMPETÊNCIAS TÉCNICAS');
      $('.skill-category:not(.hidden)').each((_, element) => {
        const category = $(element);
        const title = category.find('.skill-category-title').text().trim();
        const skills = category.find('.skill-list').text().replace(/\s+/g, ' ').trim();
        append(lines, title && skills ? `${title}: ${skills}` : skills);
      });
    }

    for (const selector of ['.education', '.certifications', '.languages']) {
      const section = $(selector).first();
      if (!section.length) continue;
      const title = section.find('.section-title').first().text().trim();
      appendHeading(lines, title.toUpperCase());
      section.find('li, p').each((_, element) => append(lines, $(element).text()));
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  async generate(html: string, outputPath: string): Promise<string> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, this.convertHTMLToText(html), 'utf8');
    return outputPath;
  }
}

function append(lines: string[], value: string): void {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized) lines.push(normalized, '');
}

function appendHeading(lines: string[], value: string): void {
  if (!value) return;
  lines.push(value, '═'.repeat(50), '');
}
